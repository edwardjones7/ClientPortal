"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateInviteToken, consumeInvite } from "@/lib/invites";
import { sendDiscord } from "@/lib/notify";

export interface AuthFormState {
  error?: string;
}

/** Email + password sign-in. On success, redirect to `next` (or home). */
export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "That email and password don't match. Try again." };
  }

  redirect(next.startsWith("/") ? next : "/");
}

/**
 * Set a password (and name) for an invited user. Authorized by possession of a
 * valid invite token (see lib/invites). The token is consumed here — not when
 * the link is opened — so the client can reach this form any number of times
 * until they actually finish, or until the link lapses.
 */
export async function setPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (password.length < 8) {
    return { error: "Use at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Those passwords don't match." };
  }

  const invite = await validateInviteToken(token);
  if (!invite) {
    return { error: "Your invite link expired. Ask Elenos to resend it." };
  }

  // Set the password (and confirm the email) via the service-role client — the
  // client isn't signed in yet; the invite token is what authorizes this.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(invite.userId, {
    password,
    email_confirm: true,
  });
  if (error) {
    return { error: "Couldn't set your password. Try the link again." };
  }

  if (fullName) {
    await admin
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", invite.userId);
  }

  // Burn the invite so the link can't be replayed, then sign the client in to
  // establish their session before dropping them in the portal.
  await consumeInvite(invite.id);

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInErr) {
    // Password is set — just send them to log in manually.
    redirect("/login?next=/");
  }

  // Notify Elenos that a client just activated their account.
  let orgName = "their team";
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invite.orgId)
    .maybeSingle();
  if (org?.name) orgName = org.name;
  await sendDiscord(
    `✅ **${fullName || invite.email}** activated their account — ${orgName}`,
  );

  redirect("/");
}

/** Sign out and return to login. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
