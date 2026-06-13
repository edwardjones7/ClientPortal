import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Conversation } from "@/components/tickets/Conversation";
import { StatusControl, PriorityControl } from "@/components/tickets/TicketControls";
import { Label } from "@/components/ui/Field";
import { getTicketDetail } from "@/lib/tickets";

export const metadata: Metadata = { title: "Ticket" };

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getTicketDetail(id);
  if (!detail) notFound();

  const { ticket } = detail;

  return (
    <div className="max-w-2xl">
      <PageHeading
        no="01"
        title={ticket.title}
        description={detail.orgName}
        action={
          <ButtonLink href="/admin/tickets" variant="ghost" size="sm">
            ← Queue
          </ButtonLink>
        }
      />

      {/* Admin controls */}
      <Panel className="mb-8 grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <Label>Status</Label>
          <StatusControl ticketId={ticket.id} value={ticket.status} />
        </div>
        <div>
          <Label>Priority</Label>
          <PriorityControl ticketId={ticket.id} value={ticket.priority} />
        </div>
      </Panel>

      <Conversation
        ticketId={ticket.id}
        description={ticket.description}
        authorName={detail.authorName}
        createdAt={ticket.created_at}
        accentAuthor={detail.accentAuthor}
        attachments={detail.attachments}
        comments={detail.comments}
      />
    </div>
  );
}
