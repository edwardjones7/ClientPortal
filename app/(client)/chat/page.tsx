import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { requireClient } from "@/lib/auth";
import { getChatData } from "@/lib/chat";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage() {
  const user = await requireClient();
  const { messages, participants } = await getChatData(user.orgId);

  return (
    <div>
      <PageHeading
        no="01"
        title="Chat"
        description="Quick questions, fast answers. For tracked work, open a ticket."
      />
      <Panel className="p-5">
        <ChatRoom
          orgId={user.orgId}
          currentUserId={user.id}
          initialMessages={messages}
          participants={participants}
        />
      </Panel>
    </div>
  );
}
