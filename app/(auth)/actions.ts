"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
 * Set a password (and name) for an invited user. Requires an active session,
 * which the invite link establishes via /auth/confirm.
 */
export async function setPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (password.length < 8) {
    return { error: "Use at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Those passwords don't match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your invite link expired. Ask Elenos to resend it." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Couldn't set your password. Try the link again." };
  }

  if (fullName) {
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  }

  // Notify Elenos that a client just activated their account.
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  let orgName = "their team";
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.org_id)
      .single();
    if (org?.name) orgName = org.name;
  }
  await sendDiscord(
    `✅ **${fullName || user.email}** activated their account — ${orgName}`,
  );

  redirect("/");
}

/** Sign out and return to login. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
