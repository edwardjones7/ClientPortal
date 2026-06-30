import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const supabase = await createClient();

  const [{ data: orgs }, { data: profiles }, { data: tickets }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, created_at")
        .eq("is_internal", false)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("org_id").eq("role", "client"),
      supabase.from("tickets").select("org_id, status"),
    ]);

  const memberCount = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (p.org_id) memberCount.set(p.org_id, (memberCount.get(p.org_id) ?? 0) + 1);
  }
  const openCount = new Map<string, number>();
  for (const t of tickets ?? []) {
    if (t.status === "closed" || t.status === "resolved") continue;
    openCount.set(t.org_id, (openCount.get(t.org_id) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeading
        no="01"
        title="Clients"
        description="Every active Elenos client. Drill in to manage their team, tickets, and chat."
        action={<ButtonLink href="/admin/invites">New client →</ButtonLink>}
      />

      {!orgs || orgs.length === 0 ? (
        <EmptyState
          title="No clients yet."
          body="Create the first organization and send a login."
          action={<ButtonLink href="/admin/invites">Invite a client →</ButtonLink>}
        />
      ) : (
        <Panel className="divide-y divide-border">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/admin/clients/${org.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2/50"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{org.name}</p>
                <p className="meta mt-1">
                  {memberCount.get(org.id) ?? 0} member
                  {(memberCount.get(org.id) ?? 0) === 1 ? "" : "s"} · since{" "}
                  {formatDateTime(org.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm text-muted">
                  {openCount.get(org.id) ?? 0} open
                </span>
                <span className="text-muted">→</span>
              </div>
            </Link>
          ))}
        </Panel>
      )}
    </div>
  );
}
