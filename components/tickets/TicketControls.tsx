"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTicketStatus, updateTicketPriority } from "@/app/actions/tickets";
import { Select } from "@/components/ui/Field";
import {
  TICKET_PRIORITY,
  TICKET_STATUS,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/types";

/** Admin status dropdown — writes immediately on change. */
export function StatusControl({
  ticketId,
  value,
}: {
  ticketId: string;
  value: TicketStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label="Status"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        start(async () => {
          await updateTicketStatus(ticketId, next);
          router.refresh();
        });
      }}
    >
      {Object.entries(TICKET_STATUS).map(([v, { label }]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </Select>
  );
}

/** Admin priority dropdown — writes immediately on change. */
export function PriorityControl({
  ticketId,
  value,
}: {
  ticketId: string;
  value: TicketPriority;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label="Priority"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        start(async () => {
          await updateTicketPriority(ticketId, next);
          router.refresh();
        });
      }}
    >
      {Object.entries(TICKET_PRIORITY).map(([v, { label }]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </Select>
  );
}
