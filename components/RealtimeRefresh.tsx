"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Postgres changes on a table (optionally filtered) and calls
 * router.refresh() when something changes — re-pulling the server-rendered view
 * with fresh, RLS-scoped data. Used to keep ticket views live without managing
 * client-side state. (Chat uses its own optimistic component instead.)
 */
export function RealtimeRefresh({
  table,
  filter,
  channel,
}: {
  table: string;
  filter?: string;
  channel: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const sub = supabase
      .channel(channel)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [table, filter, channel, router]);

  return null;
}
