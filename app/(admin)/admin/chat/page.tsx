import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";

export const metadata: Metadata = { title: "Chat" };

export default async function AdminChatListPage() {
  const supabase = await createClient();

  const [{ data: orgs }, { data: recent }] = await Promise.all([
    supabase.from("organizations").select("id, name").order("name"),
    supabase
      .from("chat_messages")
      .select("org_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  // Latest message per org.
  const last = new Map<string, { body: string; created_at: string }>();
  for (const m of recent ?? []) {
    if (!last.has(m.org_id)) last.set(m.org_id, m);
  }

  return (
    <div>
      <PageHeading
        no="01"
        title="Chat"
        description="One channel per client. Pick a conversation to reply."
      />

      {!orgs || orgs.length === 0 ? (
        <EmptyState title="No clients yet." body="Invite a client to start a channel." />
      ) : (
        <Panel className="divide-y divide-border">
          {orgs.map((org) => {
            const l = last.get(org.id);
            return (
              <Link
                key={org.id}
                href={`/admin/chat/${org.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{org.name}</p>
                  <p className="mt-0.5 truncate text-xs text-faint">
                    {l ? l.body : "No messages yet"}
                  </p>
                </div>
                {l ? (
                  <span className="meta shrink-0">
                    {formatRelative(l.created_at)}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </Panel>
      )}
    </div>
  );
}
