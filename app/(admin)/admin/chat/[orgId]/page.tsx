import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getChatData } from "@/lib/chat";

export const metadata: Metadata = { title: "Chat" };

export default async function AdminChatRoomPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const admin = await requireAdmin();
  const { orgId } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();
  if (!org) notFound();

  const { messages, participants } = await getChatData(orgId);

  return (
    <div>
      <PageHeading
        no="01"
        title={org.name}
        description="Replying as Elenos."
        action={
          <ButtonLink href="/admin/chat" variant="ghost" size="sm">
            ← Channels
          </ButtonLink>
        }
      />
      <Panel className="p-5">
        <ChatRoom
          orgId={orgId}
          currentUserId={admin.id}
          initialMessages={messages}
          participants={participants}
        />
      </Panel>
    </div>
  );
}
