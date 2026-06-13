import Link from "next/link";
import { StatusChip, Tag } from "@/components/ui/StatusChip";
import { TICKET_CATEGORY, type Ticket } from "@/lib/types";
import { formatRelative } from "@/lib/utils";

/**
 * One ticket in a list. `href` differs for client vs admin. `orgName` is shown
 * only on the admin queue (where tickets span many clients).
 */
export function TicketRow({
  ticket,
  href,
  orgName,
}: {
  ticket: Pick<
    Ticket,
    "id" | "title" | "status" | "priority" | "category" | "updated_at"
  >;
  href: string;
  orgName?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2/50"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {ticket.priority === "high" ? (
            <span
              className="h-1.5 w-1.5 rounded-full bg-danger"
              aria-label="High priority"
            />
          ) : null}
          <p className="truncate text-sm text-fg">{ticket.title}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {orgName ? <Tag>{orgName}</Tag> : null}
          <Tag>{TICKET_CATEGORY[ticket.category].label}</Tag>
          <span className="meta">updated {formatRelative(ticket.updated_at)}</span>
        </div>
      </div>
      <StatusChip status={ticket.status} />
    </Link>
  );
}
