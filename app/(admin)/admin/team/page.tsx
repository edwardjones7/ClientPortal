import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { InviteEmployeeForm } from "@/components/admin/InviteEmployeeForm";
import { ResendEmployeeInviteButton } from "@/components/admin/ResendEmployeeInviteButton";
import { RemoveEmployeeButton } from "@/components/admin/RemoveEmployeeButton";
import { viewAsEmployee } from "@/app/(admin)/actions";
import { getInternalOrgId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const internalOrgId = await getInternalOrgId();

  if (!internalOrgId) {
    return (
      <div className="max-w-3xl">
        <PageHeading
          no="01"
          title="Team"
          description="Your internal staff and sales reps."
        />
        <EmptyState
          title="Internal team not set up yet."
          body="Apply migration 0006_team_and_assignments.sql to your Supabase project — it creates the internal “Elenos Team” org that employees belong to."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .eq("org_id", internalOrgId)
    .eq("role", "employee")
    .order("created_at", { ascending: true })
    .returns<Profile[]>();

  // Activation status from the auth users (confirmed email or has signed in).
  const confirmed = new Set<string>();
  const { data: authList } = await createAdminClient().auth.admin.listUsers();
  for (const u of authList?.users ?? []) {
    if (u.email_confirmed_at || u.last_sign_in_at) confirmed.add(u.id);
  }

  return (
    <div className="max-w-3xl">
      <PageHeading
        no="01"
        title="Team"
        description="Your internal staff and sales reps. They see only the training you assign them."
        action={
          <form action={viewAsEmployee}>
            <Button type="submit" variant="secondary" size="sm">
              View as employee →
            </Button>
          </form>
        }
      />

      <section className="mb-8">
        <p className="section-no mb-3">02 / Members</p>
        {(members ?? []).length === 0 ? (
          <Panel className="px-5 py-8 text-center text-sm text-muted">
            No employees yet. Invite your first below.
          </Panel>
        ) : (
          <Panel className="divide-y divide-border">
            {(members ?? []).map((m) => {
              const active = confirmed.has(m.id);
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={m.full_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fg">
                      {m.full_name ?? "Invited"}
                    </p>
                    <p className="truncate text-xs text-faint">{m.email}</p>
                  </div>
                  {active ? (
                    <span className="shrink-0 text-xs text-resolved">Active</span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-waiting">Pending</span>
                      <ResendEmployeeInviteButton
                        email={m.email}
                        fullName={m.full_name ?? ""}
                      />
                    </div>
                  )}
                  <RemoveEmployeeButton
                    profileId={m.id}
                    name={m.full_name ?? m.email}
                  />
                </div>
              );
            })}
          </Panel>
        )}
      </section>

      <section>
        <p className="section-no mb-3">03 / Invite</p>
        <Panel className="p-5">
          <InviteEmployeeForm />
          <p className="meta mt-3">
            No email is sent — copy the link and send it. Valid 12 hours, reusable
            until they set a password. Assign their training from Academy.
          </p>
        </Panel>
      </section>
    </div>
  );
}
