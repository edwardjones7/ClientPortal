"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cx, formatRelative } from "@/lib/utils";

export interface ChatMsgView {
  id: string;
  body: string;
  author_id: string | null;
  created_at: string;
}

export interface Participant {
  name: string;
  accent: boolean;
}

/**
 * Real-time per-org chat. Loads with server-rendered history, then streams new
 * messages via Supabase Realtime (RLS-scoped to this org). Sends are optimistic
 * and reconciled against the inserted row + realtime echo (deduped by id).
 */
export function ChatRoom({
  orgId,
  currentUserId,
  initialMessages,
  participants,
}: {
  orgId: string;
  currentUserId: string;
  initialMessages: ChatMsgView[];
  participants: Record<string, Participant>;
}) {
  const [messages, setMessages] = useState<ChatMsgView[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient());

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Live subscription for this org's channel.
  useEffect(() => {
    const client = supabase.current;
    const sub = client
      .channel(`chat-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "portal",
          table: "chat_messages",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as ChatMsgView;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(sub);
    };
  }, [orgId]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMsgView = {
      id: tempId,
      body,
      author_id: currentUserId,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    const { data, error } = await supabase.current
      .from("chat_messages")
      .insert({ org_id: orgId, author_id: currentUserId, body })
      .select("id, body, author_id, created_at")
      .single();

    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      if (error || !data) return withoutTemp; // drop on failure
      return withoutTemp.some((m) => m.id === data.id)
        ? withoutTemp
        : [...withoutTemp, data as ChatMsgView];
    });
    setSending(false);
  }

  function nameFor(authorId: string | null): Participant {
    if (authorId && participants[authorId]) return participants[authorId];
    if (authorId === currentUserId) return { name: "You", accent: false };
    return { name: "Elenos", accent: true };
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            No messages yet. Say hello, or ask us anything.
          </p>
        ) : (
          messages.map((m) => {
            const who = nameFor(m.author_id);
            const mine = m.author_id === currentUserId;
            return (
              <div key={m.id} className="flex gap-3">
                <Avatar name={who.name} accent={who.accent} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className={cx(mine ? "text-fg" : "text-fg")}>
                      {who.name}
                    </span>{" "}
                    <span className="meta">· {formatRelative(m.created_at)}</span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex items-end gap-2 border-t border-border pt-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Message Elenos… (Enter to send)"
          className="min-h-10 flex-1 resize-none rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <Button onClick={() => void send()} disabled={sending || !draft.trim()}>
          Send →
        </Button>
      </div>
    </div>
  );
}
