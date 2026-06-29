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

/**
 * Sends a plain-text email via the Resend REST API (no SDK dependency).
 * No-ops silently if RESEND_API_KEY or NOTIFY_EMAIL_FROM isn't set, and never
 * throws — like sendDiscord, a notification failure must not break the action
 * that triggered it. `to` may be a single address or a list (skips if empty).
 */
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string | string[];
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_EMAIL_FROM;
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!apiKey || !from || recipients.length === 0) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: recipients, subject, text }),
    });
  } catch {
    // swallow — notifications are best-effort
  }
}

/** Base URL of the portal, for links inside notifications. */
export function portalUrl(): string {
  return process.env.PORTAL_URL ?? "https://portal.elenos.ai";
}

/** Trim a message body for a one-line notification. */
export function snippet(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
