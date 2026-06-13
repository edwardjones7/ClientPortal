import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export interface InviteResult {
  ok: boolean;
  error?: string;
  /** A ready-to-send invite link the admin copies and sends to the client. */
  link?: string;
}

/**
 * Invite a user into an organization. Creates the auth user, links the profile,
 * and returns a self-contained invite LINK for the admin to send manually (no
 * SMTP / email deliverability dependency). The link points straight at our
 * /auth/confirm route with a one-time token_hash, so clicking it establishes a
 * session and drops the client on /set-password.
 *
 * Service-role only — callers MUST authorize first (admin, or a client
 * inviting into their own org).
 */
export async function inviteUserToOrg(params: {
  email: string;
  fullName: string;
  orgId: string;
  role?: "client" | "admin";
}): Promise<InviteResult> {
  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName.trim();
  if (!email) return { ok: false, error: "Enter an email address." };

  const admin = createAdminClient();

  // generateLink creates the user and returns a one-time token WITHOUT sending
  // an email — we hand the link to the admin to send themselves.
  const { data, error: linkErr } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name: fullName } },
  });

  if (linkErr || !data?.user || !data.properties?.hashed_token) {
    const msg = linkErr?.message ?? "";
    if (/already|registered|exists/i.test(msg)) {
      return { ok: false, error: "That email already has an account." };
    }
    return { ok: false, error: "Couldn't create the invite. Check the email." };
  }

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: data.user.id,
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

  const token = data.properties.hashed_token;
  const link = `${siteUrl()}/auth/confirm?token_hash=${token}&type=invite&next=/set-password`;
  return { ok: true, link };
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
