/**
 * Domain types for the Elenos client portal. These mirror the Postgres
 * schema in supabase/migrations. Kept hand-written (rather than generated)
 * while the schema is small; swap for `supabase gen types` later if desired.
 */

export type Role = "client" | "admin" | "employee";

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
  /** True for the single internal "Elenos Team" org that employees belong to. */
  is_internal: boolean;
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

/* ---- Courses / Academy ---- */

export type VideoProvider = "youtube" | "vimeo";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  title: string;
  provider: VideoProvider;
  video_id: string;
  position: number;
  created_at: string;
}

export interface CourseAssignment {
  id: string;
  course_id: string;
  /** Exactly one of org_id / profile_id is set (org-wide vs. per-person). */
  org_id: string | null;
  profile_id: string | null;
  assigned_by: string | null;
  created_at: string;
}

export interface CourseResource {
  id: string;
  course_id: string;
  title: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  position: number;
  created_by: string | null;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  profile_id: string;
  lesson_id: string;
  org_id: string;
  seconds_watched: number;
  last_position: number;
  duration_seconds: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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
