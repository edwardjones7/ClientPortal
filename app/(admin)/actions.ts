"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrganization, inviteUserToOrg } from "@/lib/invites";

export interface InviteFormState {
  ok?: boolean;
  error?: string;
  message?: string;
  /** Invite link for the admin to copy and send to the client. */
  link?: string;
}

/** Admin: create a new client organization and invite its first user. */
export async function createOrgAndInvite(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  await requireAdmin();

  const orgName = String(formData.get("org_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!orgName) return { error: "Enter the client's business name." };
  if (!email) return { error: "Enter an email to invite." };

  const org = await createOrganization(orgName);
  if (org.error || !org.id) return { error: org.error ?? "Couldn't create org." };

  const invite = await inviteUserToOrg({ email, fullName, orgId: org.id });
  if (!invite.ok) {
    // Org was created; surface the invite error so the admin can retry the
    // invite from the client's detail page rather than re-creating the org.
    revalidatePath("/admin/clients");
    return { error: `${invite.error} The organization was created — invite from its page.` };
  }

  revalidatePath("/admin/clients");
  return {
    ok: true,
    message: `${orgName} created. Send ${email} this link to set their password:`,
    link: invite.link,
  };
}

/** Admin: invite an additional user into an existing org. */
export async function inviteToExistingOrg(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  await requireAdmin();

  const orgId = String(formData.get("org_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!orgId) return { error: "Missing organization." };

  const invite = await inviteUserToOrg({ email, fullName, orgId });
  if (!invite.ok) return { error: invite.error };

  revalidatePath(`/admin/clients/${orgId}`);
  return {
    ok: true,
    message: `Send ${email} this link to set their password:`,
    link: invite.link,
  };
}

/**
 * Admin: generate a FRESH invite/login link for a specific member (e.g. when
 * the first link expired). Returns the new link to copy and resend.
 */
export async function resendClientInvite(
  orgId: string,
  email: string,
  fullName: string,
): Promise<InviteFormState> {
  await requireAdmin();
  const invite = await inviteUserToOrg({ email, fullName, orgId });
  if (!invite.ok) return { error: invite.error };
  return { ok: true, message: "Fresh link — send it to them:", link: invite.link };
}

/**
 * Admin: permanently remove a client. Deletes every member's auth account
 * (which cascades their profiles) and the organization (which cascades its
 * tickets, comments, attachments, and chat). Not reversible.
 */
export async function removeClient(
  orgId: string,
): Promise<{ error?: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  // Delete each member's auth user — cascades the profile row.
  const { data: members } = await admin
    .from("profiles")
    .select("id")
    .eq("org_id", orgId);
  for (const m of members ?? []) {
    await admin.auth.admin.deleteUser(m.id);
  }

  // Delete the org — cascades tickets, comments, attachments, chat.
  const { error } = await admin.from("organizations").delete().eq("id", orgId);
  if (error) return { error: "Couldn't remove the client. Try again." };

  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}
