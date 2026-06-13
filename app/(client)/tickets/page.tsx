import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { TicketRow } from "@/components/tickets/TicketRow";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Ticket } from "@/lib/types";

export const metadata: Metadata = { title: "Tickets" };

export default async function TicketsPage() {
  const { orgId } = await requireClient();
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, title, status, priority, category, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false })
    .returns<Ticket[]>();

  const active = (tickets ?? []).filter(
    (t) => t.status !== "closed" && t.status !== "resolved",
  );
  const done = (tickets ?? []).filter(
    (t) => t.status === "closed" || t.status === "resolved",
  );

  return (
    <div>
      <RealtimeRefresh
        table="tickets"
        filter={`org_id=eq.${orgId}`}
        channel={`tickets-${orgId}`}
      />
      <PageHeading
        no="01"
        title="Tickets"
        description="Every request you've sent us — open and resolved. Updates land here live."
        action={<ButtonLink href="/tickets/new">New request →</ButtonLink>}
      />

      {(tickets ?? []).length === 0 ? (
        <EmptyState
          title="No requests yet."
          body="Need a change to your site or software? Send it over and we'll get on it."
          action={<ButtonLink href="/tickets/new">Submit a request →</ButtonLink>}
        />
      ) : (
        <div className="space-y-8">
          <section>
            <p className="section-no mb-3">02 / Active</p>
            {active.length === 0 ? (
              <Panel className="px-5 py-8 text-center text-sm text-muted">
                Nothing open. Quiet is good.
              </Panel>
            ) : (
              <Panel className="divide-y divide-border">
                {active.map((t) => (
                  <TicketRow key={t.id} ticket={t} href={`/tickets/${t.id}`} />
                ))}
              </Panel>
            )}
          </section>

          {done.length > 0 ? (
            <section>
              <p className="section-no mb-3">03 / Resolved</p>
              <Panel className="divide-y divide-border">
                {done.map((t) => (
                  <TicketRow key={t.id} ticket={t} href={`/tickets/${t.id}`} />
                ))}
              </Panel>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
