/**
 * Domain types for the Elenos client portal. These mirror the Postgres
 * schema in supabase/migrations. Kept hand-written (rather than generated)
 * while the schema is small; swap for `supabase gen types` later if desired.
 */

export type Role = "client" | "admin";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_on_client"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "normal" | "high";

export type TicketCategory =
  | "website_update"
  | "bug"
  | "new_feature"
  | "question"
  | "other";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  lead_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  org_id: string | null;
  full_name: string | null;
  email: string;
  role: Role;
  created_at: string;
}

export interface Ticket {
  id: string;
  org_id: string;
  created_by: string | null;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  storage_path: string;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  org_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

/* ---- Display metadata (labels + brand colors) ---- */

export const TICKET_STATUS: Record<
  TicketStatus,
  { label: string; color: string }
> = {
  open: { label: "Open", color: "var(--color-open)" },
  in_progress: { label: "In progress", color: "var(--color-progress)" },
  waiting_on_client: { label: "Waiting on you", color: "var(--color-waiting)" },
  resolved: { label: "Resolved", color: "var(--color-resolved)" },
  closed: { label: "Closed", color: "var(--color-closed)" },
};

export const TICKET_PRIORITY: Record<TicketPriority, { label: string }> = {
  low: { label: "Low" },
  normal: { label: "Normal" },
  high: { label: "High" },
};

export const TICKET_CATEGORY: Record<TicketCategory, { label: string }> = {
  website_update: { label: "Website update" },
  bug: { label: "Bug" },
  new_feature: { label: "New feature" },
  question: { label: "Question" },
  other: { label: "Other" },
};
