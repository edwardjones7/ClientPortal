import { Panel } from "@/components/ui/Panel";
import { Avatar } from "@/components/ui/Avatar";
import { CommentForm } from "./CommentForm";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { formatDateTime } from "@/lib/utils";

export interface CommentView {
  id: string;
  body: string;
  created_at: string;
  authorName: string;
  accent: boolean;
}

export interface AttachmentView {
  id: string;
  file_name: string;
  url: string | null;
}

/**
 * The shared ticket conversation: original request, attachments, threaded
 * replies, and the composer. Live via RealtimeRefresh. Rendered on both the
 * client and admin ticket detail pages.
 */
export function Conversation({
  ticketId,
  description,
  authorName,
  createdAt,
  accentAuthor,
  attachments,
  comments,
}: {
  ticketId: string;
  description: string;
  authorName: string;
  createdAt: string;
  accentAuthor: boolean;
  attachments: AttachmentView[];
  comments: CommentView[];
}) {
  return (
    <div className="space-y-6">
      <RealtimeRefresh
        table="ticket_comments"
        filter={`ticket_id=eq.${ticketId}`}
        channel={`ticket-comments-${ticketId}`}
      />
      <RealtimeRefresh
        table="tickets"
        filter={`id=eq.${ticketId}`}
        channel={`ticket-${ticketId}`}
      />

      {/* Original request */}
      <div className="flex gap-3">
        <Avatar name={authorName} accent={accentAuthor} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="text-fg">{authorName}</span>{" "}
            <span className="meta">· {formatDateTime(createdAt)}</span>
          </p>
          {description ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
              {description}
            </p>
          ) : (
            <p className="mt-1 text-sm text-faint">No additional details.</p>
          )}
          {attachments.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {attachments.map((a) =>
                a.url ? (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-muted hover:text-fg"
                  >
                    ↓ {a.file_name}
                  </a>
                ) : (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-faint"
                  >
                    {a.file_name}
                  </span>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Replies */}
      {comments.length > 0 ? (
        <ol className="space-y-5 border-l border-border pl-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.authorName} accent={c.accent} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="text-fg">{c.authorName}</span>{" "}
                  <span className="meta">· {formatDateTime(c.created_at)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {/* Composer */}
      <Panel className="p-4">
        <CommentForm ticketId={ticketId} />
      </Panel>
    </div>
  );
}
