import Link from "next/link";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import type { Ticket } from "@/lib/types";

const ACTIVE = ["open", "in_progress", "waiting_on_client"];

export default async function DashboardPage() {
  const user = await requireClient();
  const supabase = await createClient();

  const [{ data: org }, { data: tickets }, { data: lastChat }] =
    await Promise.all([
      supabase.from("organizations").select("name").eq("id", user.orgId).single(),
      supabase
        .from("tickets")
        .select("id, title, status, priority, category, updated_at")
        .eq("org_id", user.orgId)
        .order("updated_at", { ascending: false })
        .returns<Ticket[]>(),
      supabase
        .from("chat_messages")
        .select("body, created_at")
        .eq("org_id", user.orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const active = (tickets ?? []).filter((t) => ACTIVE.includes(t.status));
  const firstName = (user.profile.full_name ?? "").split(" ")[0];

  return (
    <div>
      <PageHeading
        no="01"
        title={firstName ? `Welcome, ${firstName}` : "Welcome"}
        description={`The portal for ${org?.name ?? "your team"}. Submit work, track updates, talk to us.`}
        action={<ButtonLink href="/tickets/new">New request →</ButtonLink>}
      />

      {/* Stat row */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="meta">Open requests</p>
          <p className="mt-2 text-3xl font-semibold text-fg">{active.length}</p>
        </Panel>
        <Panel className="p-5">
          <p className="meta">Total requests</p>
          <p className="mt-2 text-3xl font-semibold text-fg">
            {(tickets ?? []).length}
          </p>
        </Panel>
        <Link href="/chat" className="block">
          <Panel className="h-full p-5 transition-colors hover:bg-surface-2/50">
            <p className="meta">Latest from chat</p>
            <p className="mt-2 line-clamp-2 text-sm text-muted">
              {lastChat?.body ?? "No messages yet — say hello."}
            </p>
            {lastChat ? (
              <p className="meta mt-2">{formatRelative(lastChat.created_at)}</p>
            ) : null}
          </Panel>
        </Link>
      </div>

      {/* Active tickets */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="section-no">02 / Active work</p>
          <Link href="/tickets" className="text-xs text-muted hover:text-fg">
            All tickets →
          </Link>
        </div>
        {active.length === 0 ? (
          <Panel className="px-5 py-10 text-center">
            <p className="text-sm text-fg">Nothing open. Quiet is good.</p>
            <p className="mt-1 text-sm text-muted">
              When you need a change, send it over.
            </p>
            <div className="mt-5">
              <ButtonLink href="/tickets/new">Submit a request →</ButtonLink>
            </div>
          </Panel>
        ) : (
          <Panel className="divide-y divide-border">
            {active.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2/50"
              >
                <span className="min-w-0 truncate text-sm text-fg">
                  {t.title}
                </span>
                <StatusChip status={t.status} />
              </Link>
            ))}
          </Panel>
        )}
      </section>
    </div>
  );
}
