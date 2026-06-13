import { TICKET_STATUS, type TicketStatus } from "@/lib/types";

/** Small colored dot + label for a ticket status. */
export function StatusChip({ status }: { status: TicketStatus }) {
  const { label, color } = TICKET_STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** A neutral pill for categories, priorities, counts. */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
      {children}
    </span>
  );
}
