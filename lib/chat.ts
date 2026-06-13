import { createClient } from "@/lib/supabase/server";
import type {
  ChatMsgView,
  Participant,
} from "@/components/chat/ChatRoom";

export interface ChatData {
  messages: ChatMsgView[];
  participants: Record<string, Participant>;
}

/**
 * Loads an org's chat history plus a lookup of who's who (org members +
 * Elenos admins) so the client component can label authors without extra
 * round-trips. RLS-scoped — works for both the client and the admin viewer.
 */
export async function getChatData(orgId: string): Promise<ChatData> {
  const supabase = await createClient();

  const [{ data: messages }, { data: members }, { data: admins }] =
    await Promise.all([
      supabase
        .from("chat_messages")
        .select("id, body, author_id, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true })
        .limit(200),
      supabase.from("profiles").select("id, full_name, role").eq("org_id", orgId),
      supabase.from("profiles").select("id, full_name, role").eq("role", "admin"),
    ]);

  const participants: Record<string, Participant> = {};
  for (const p of [...(members ?? []), ...(admins ?? [])]) {
    participants[p.id] = {
      name: p.full_name ?? (p.role === "admin" ? "Elenos" : "Client"),
      accent: p.role === "admin",
    };
  }

  return { messages: (messages ?? []) as ChatMsgView[], participants };
}
