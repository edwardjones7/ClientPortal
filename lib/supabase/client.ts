import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (browser). Used for Realtime
 * subscriptions (chat, live ticket updates) and client-side mutations.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "portal" } },
  );
}
