import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { NameForm, TeammateForm } from "@/components/settings/SettingsForms";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireClient();
  const supabase = await createClient();

  const [{ data: org }, { data: members }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", user.orgId).single(),
    supabase
      .from("profiles")
      .select("*")
      .eq("org_id", user.orgId)
      .order("created_at", { ascending: true })
      .returns<Profile[]>(),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeading
        no="01"
        title="Settings"
        description={org?.name ?? "Your team"}
      />

      <section className="mb-10">
        <p className="section-no mb-3">02 / Your profile</p>
        <Panel className="p-5">
          <NameForm defaultName={user.profile.full_name ?? ""} />
          <p className="meta mt-4">Signed in as {user.email}</p>
        </Panel>
      </section>

      <section>
        <p className="section-no mb-3">03 / Team</p>
        <Panel className="divide-y divide-border">
          {(members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={m.full_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">
                  {m.full_name ?? "Invited"}
                  {m.id === user.id ? (
                    <span className="ml-2 text-xs text-faint">you</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-faint">{m.email}</p>
              </div>
            </div>
          ))}
        </Panel>
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted">Invite a teammate</p>
          <TeammateForm />
          <p className="meta mt-3">
            Teammates get their own login · same tickets, same chat
          </p>
        </div>
      </section>
    </div>
  );
}
