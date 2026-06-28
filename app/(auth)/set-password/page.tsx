import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateInviteToken } from "@/lib/invites";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const metadata: Metadata = { title: "Set your password" };

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // The invite link carries our own token; opening this page doesn't use it up,
  // so the client can come back to it any number of times until it lapses.
  const { token } = await searchParams;
  const invite = token ? await validateInviteToken(token) : null;
  if (!invite) redirect("/login?error=link");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", invite.userId)
    .maybeSingle();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">
        Set your password
      </h1>
      <p className="mb-6 text-sm text-muted">
        One step. Then you&apos;re in.
      </p>
      <SetPasswordForm token={token!} defaultName={profile?.full_name ?? ""} />
    </div>
  );
}
