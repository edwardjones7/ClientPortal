import "server-only";

/**
 * Sends a notification to Elenos's Discord channel via an incoming webhook.
 * No-ops silently if DISCORD_WEBHOOK_URL isn't set, and never throws — a
 * notification failure must never break the action that triggered it.
 */
export async function sendDiscord(content: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, username: "Elenos Portal" }),
    });
  } catch {
    // swallow — notifications are best-effort
  }
}

/** Trim a message body for a one-line notification. */
export function snippet(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
