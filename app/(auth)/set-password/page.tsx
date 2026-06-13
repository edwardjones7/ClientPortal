import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export const metadata: Metadata = { title: "Set your password" };

export default async function SetPasswordPage() {
  // The invite link must have established a session via /auth/confirm.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=link");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">
        Set your password
      </h1>
      <p className="mb-6 text-sm text-muted">
        One step. Then you&apos;re in.
      </p>
      <SetPasswordForm defaultName={profile?.full_name ?? ""} />
    </div>
  );
}
