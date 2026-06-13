import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { ButtonLink } from "@/components/ui/Button";
import { StatusChip, Tag } from "@/components/ui/StatusChip";
import { Conversation } from "@/components/tickets/Conversation";
import { getTicketDetail } from "@/lib/tickets";
import { requireClient } from "@/lib/auth";
import { TICKET_CATEGORY, TICKET_PRIORITY } from "@/lib/types";

export const metadata: Metadata = { title: "Ticket" };

export default async function ClientTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireClient();
  const { id } = await params;
  const detail = await getTicketDetail(id);
  if (!detail) notFound();

  const { ticket } = detail;

  return (
    <div className="max-w-2xl">
      <PageHeading
        no="01"
        title={ticket.title}
        action={
          <ButtonLink href="/tickets" variant="ghost" size="sm">
            ← Tickets
          </ButtonLink>
        }
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <StatusChip status={ticket.status} />
        <Tag>{TICKET_CATEGORY[ticket.category].label}</Tag>
        <Tag>{TICKET_PRIORITY[ticket.priority].label} priority</Tag>
      </div>

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
