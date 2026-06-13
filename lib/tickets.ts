import { createClient } from "@/lib/supabase/server";
import type { Ticket } from "@/lib/types";
import type {
  AttachmentView,
  CommentView,
} from "@/components/tickets/Conversation";

export interface TicketDetail {
  ticket: Ticket;
  orgName: string;
  authorName: string;
  accentAuthor: boolean;
  comments: CommentView[];
  attachments: AttachmentView[];
}

function displayName(
  fullName: string | null | undefined,
  role: string | null | undefined,
  fallbackClient = "Client",
): string {
  if (fullName) return fullName;
  return role === "admin" ? "Elenos" : fallbackClient;
}

/**
 * Fetches a ticket with its org, author, threaded comments, and signed
 * attachment URLs. RLS-scoped: returns null if the caller can't see it.
 * Works for both client and admin callers.
 */
export async function getTicketDetail(
  ticketId: string,
): Promise<TicketDetail | null> {
  const supabase = await createClient();

  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "*, org:organizations(name), creator:profiles!tickets_created_by_fkey(full_name, role)",
    )
    .eq("id", ticketId)
    .single();

  if (!ticket) return null;

  const [{ data: rawComments }, { data: rawAttachments }] = await Promise.all([
    supabase
      .from("ticket_comments")
      .select(
        "id, body, created_at, author:profiles!ticket_comments_author_id_fkey(full_name, role)",
      )
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
    supabase
      .from("ticket_attachments")
      .select("id, file_name, storage_path")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true }),
  ]);

  const comments: CommentView[] = (rawComments ?? []).map((c) => {
    const author = c.author as unknown as {
      full_name: string | null;
      role: string;
    } | null;
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      authorName: displayName(author?.full_name, author?.role),
      accent: author?.role === "admin",
    };
  });

  const attachments: AttachmentView[] = await Promise.all(
    (rawAttachments ?? []).map(async (a) => {
      const { data: signed } = await supabase.storage
        .from("ticket-attachments")
        .createSignedUrl(a.storage_path, 60 * 60);
      return { id: a.id, file_name: a.file_name, url: signed?.signedUrl ?? null };
    }),
  );

  const org = ticket.org as unknown as { name: string } | null;
  const creator = ticket.creator as unknown as {
    full_name: string | null;
    role: string;
  } | null;

  return {
    ticket: ticket as unknown as Ticket,
    orgName: org?.name ?? "—",
    authorName: displayName(creator?.full_name, creator?.role),
    accentAuthor: creator?.role === "admin",
    comments,
    attachments,
  };
}
