import "server-only";
import { randomBytes, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/** How long an invite link stays usable. Unlimited clicks until it lapses. */
const INVITE_TTL_HOURS = 12;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export interface InviteResult {
  ok: boolean;
  error?: string;
  /** A ready-to-send invite link the admin copies and sends to the client. */
  link?: string;
}

/** A validated, still-usable invite (already checked for expiry + consumption). */
export interface ValidInvite {
  id: string;
  userId: string;
  orgId: string;
  email: string;
}

/**
 * Find the auth user for `email`, creating it if it doesn't exist yet. We set
 * email_confirm so the account is usable the moment the client picks a password
 * (no separate confirmation step). Returns the user id.
 */
async function findOrCreateAuthUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  fullName: string,
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (!error && data?.user) return { id: data.user.id };

  // Already registered (e.g. a resend) → look the user up. Our profiles table
  // is populated for every invited user, so it's the cheapest lookup.
  if (error && /already|registered|exists/i.test(error.message ?? "")) {
    const { data: prof } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (prof?.id) return { id: prof.id };

    // Fallback: scan the auth users (covers an auth user with no profile row).
    const { data: list } = await admin.auth.admin.listUsers();
    const found = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return { id: found.id };
  }

  return { error: "Couldn't create or find the user. Check the email." };
}

/**
 * Invite a user into an organization. Creates (or finds) the auth user, links
 * the profile, and returns a self-contained invite LINK for the admin to send
 * manually (no SMTP / email deliverability dependency).
 *
 * The link carries our OWN random token (not a Supabase OTP), so it survives
 * link-scanners and reloads: it can be opened any number of times until it
 * lapses after {@link INVITE_TTL_HOURS}h, and is only consumed when the client
 * actually sets a password.
 *
 * Service-role only — callers MUST authorize first (admin, or a client
 * inviting into their own org).
 */
export async function inviteUserToOrg(params: {
  email: string;
  fullName: string;
  orgId: string;
  role?: "client" | "admin" | "employee";
}): Promise<InviteResult> {
  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName.trim();
  if (!email) return { ok: false, error: "Enter an email address." };

  const admin = createAdminClient();

  const user = await findOrCreateAuthUser(admin, email, fullName);
  if (user.error || !user.id) {
    return { ok: false, error: user.error ?? "Couldn't create the invite." };
  }

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: user.id,
      org_id: params.orgId,
      email,
      full_name: fullName || null,
      role: params.role ?? "client",
    },
    { onConflict: "id" },
  );

  if (profileErr) {
    return { ok: false, error: "Account made, but profile setup failed." };
  }

  // A resend supersedes any earlier link: drop this user's old invites first,
  // so only the freshest link works.
  await admin.from("invites").delete().eq("user_id", user.id);

  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600_000);
  const { error: inviteErr } = await admin.from("invites").insert({
    user_id: user.id,
    org_id: params.orgId,
    email,
    token_hash: hashToken(raw),
    expires_at: expiresAt.toISOString(),
  });

  if (inviteErr) {
    return { ok: false, error: "Account made, but the invite link failed." };
  }

  const link = `${siteUrl()}/set-password?token=${raw}`;
  return { ok: true, link };
}

/**
 * Look up an invite by its raw token. Returns the invite only if it exists, is
 * not yet consumed, and has not lapsed — otherwise null. Read-only: opening the
 * link does NOT use it up. Service-role only.
 */
export async function validateInviteToken(
  raw: string,
): Promise<ValidInvite | null> {
  if (!raw) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("invites")
    .select("id, user_id, org_id, email, expires_at, consumed_at")
    .eq("token_hash", hashToken(raw))
    .maybeSingle();

  if (!data) return null;
  if (data.consumed_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  return {
    id: data.id,
    userId: data.user_id,
    orgId: data.org_id,
    email: data.email,
  };
}

/** Mark an invite as used so the link can't be replayed. Service-role only. */
export async function consumeInvite(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("invites")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id);
}

/** Create an org with a unique slug. Service-role only; authorize first. */
export async function createOrganization(name: string): Promise<{
  id?: string;
  error?: string;
}> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Enter a business name." };

  const admin = createAdminClient();
  const base = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "client";

  // Try the base slug, then suffix on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug =
      attempt === 0 ? base : `${base}-${Math.floor(Math.random() * 9000) + 1000}`;
    const { data, error } = await admin
      .from("organizations")
      .insert({ name: trimmed, slug })
      .select("id")
      .single();
    if (!error && data) return { id: data.id };
    if (error && !/duplicate|unique/i.test(error.message)) {
      return { error: "Couldn't create the organization." };
    }
  }
  return { error: "Couldn't find a free slug. Try a different name." };
}
