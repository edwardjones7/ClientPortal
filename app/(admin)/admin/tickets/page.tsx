import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { TicketRow } from "@/components/tickets/TicketRow";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ticket queue" };

const ACTIVE = ["open", "in_progress", "waiting_on_client"];

export default async function AdminTicketsPage() {
  const supabase = await createClient();

  // Admin RLS sees all orgs. Join org name for the queue.
  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "id, title, status, priority, category, updated_at, org:organizations(name)",
    )
    .order("updated_at", { ascending: false });

  const rows = (tickets ?? []).map((t) => ({
    ...t,
    orgName: (t.org as unknown as { name: string } | null)?.name ?? "—",
  }));
  const active = rows.filter((t) => ACTIVE.includes(t.status));
  const done = rows.filter((t) => !ACTIVE.includes(t.status));

  return (
    <div>
      <RealtimeRefresh table="tickets" channel="admin-tickets" />
      <PageHeading
        no="01"
        title="Ticket queue"
        description="Every open request across all clients. Highest-priority work first."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No tickets yet."
          body="When clients submit work, it lands here."
        />
      ) : (
        <div className="space-y-8">
          <section>
            <p className="section-no mb-3">02 / Active · {active.length}</p>
            {active.length === 0 ? (
              <Panel className="px-5 py-8 text-center text-sm text-muted">
                Queue clear. Nothing waiting.
              </Panel>
            ) : (
              <Panel className="divide-y divide-border">
                {active.map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    href={`/admin/tickets/${t.id}`}
                    orgName={t.orgName}
                  />
                ))}
              </Panel>
            )}
          </section>

          {done.length > 0 ? (
            <section>
              <p className="section-no mb-3">03 / Closed · {done.length}</p>
              <Panel className="divide-y divide-border">
                {done.map((t) => (
                  <TicketRow
                    key={t.id}
                    ticket={t}
                    href={`/admin/tickets/${t.id}`}
                    orgName={t.orgName}
                  />
                ))}
              </Panel>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
