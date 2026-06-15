import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/StatusChip";
import { ButtonLink } from "@/components/ui/Button";
import { InviteUserForm } from "@/components/admin/InviteUserForm";
import { RemoveClientButton } from "@/components/admin/RemoveClientButton";
import { ResendInviteButton } from "@/components/admin/ResendInviteButton";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";
import type { Profile, Ticket } from "@/lib/types";

export const metadata: Metadata = { title: "Client" };

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .eq("id", orgId)
    .single();
  if (!org) notFound();

  const [{ data: members }, { data: tickets }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true })
      .returns<Profile[]>(),
    supabase
      .from("tickets")
      .select("*")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .returns<Ticket[]>(),
  ]);

  // Which members have activated (confirmed their email / signed in)?
  const confirmed = new Set<string>();
  const { data: authList } = await createAdminClient().auth.admin.listUsers();
  for (const u of authList?.users ?? []) {
    if (u.email_confirmed_at || u.last_sign_in_at) confirmed.add(u.id);
  }

  return (
    <div className="max-w-3xl">
      <PageHeading
        no="01"
        title={org.name}
        description={`Client since ${formatDateTime(org.created_at)}`}
        action={
          <div className="flex items-start gap-2">
            <ButtonLink href="/admin/chat" variant="secondary" size="sm">
              Open chat →
            </ButtonLink>
            <RemoveClientButton orgId={orgId} name={org.name} />
          </div>
        }
      />

      <section className="mb-10">
        <p className="section-no mb-3">02 / Team</p>
        <Panel className="divide-y divide-border">
          {(members ?? []).map((m) => {
            const isAdmin = m.role === "admin";
            const active = confirmed.has(m.id);
            return (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={m.full_name} accent={isAdmin} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">
                    {m.full_name ?? "—"}
                    {isAdmin ? (
                      <span className="ml-2 text-xs text-accent">Elenos</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-faint">{m.email}</p>
                </div>
                {!isAdmin ? (
                  active ? (
                    <span className="shrink-0 text-xs text-resolved">Active</span>
                  ) : (
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-waiting">Pending</span>
                      <ResendInviteButton
                        orgId={orgId}
                        email={m.email}
                        fullName={m.full_name ?? ""}
                      />
                    </div>
                  )
                ) : null}
              </div>
            );
          })}
        </Panel>
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted">Invite a teammate</p>
          <InviteUserForm orgId={orgId} />
        </div>
      </section>

      <section>
        <p className="section-no mb-3">03 / Tickets</p>
        {!tickets || tickets.length === 0 ? (
          <Panel className="px-5 py-8 text-center text-sm text-muted">
            No tickets from this client yet.
          </Panel>
        ) : (
          <Panel className="divide-y divide-border">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/admin/tickets/${t.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-surface-2/50"
              >
                <span className="min-w-0 truncate text-sm text-fg">{t.title}</span>
                <StatusChip status={t.status} />
              </Link>
            ))}
          </Panel>
        )}
      </section>
    </div>
  );
}
