"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { inviteUserToOrg } from "@/lib/invites";

export interface SettingsState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/** Update the signed-in user's display name. */
export async function updateName(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "Enter your name." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);
  if (error) return { error: "Couldn't save your name." };

  revalidatePath("/settings");
  return { ok: true, message: "Saved." };
}

/** Invite a teammate into the caller's own organization. */
export async function inviteTeammate(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireClient();
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  const result = await inviteUserToOrg({ email, fullName, orgId: user.orgId });
  if (!result.ok) return { error: result.error };

  revalidatePath("/settings");
  return { ok: true, message: `Invited ${email}.` };
}
