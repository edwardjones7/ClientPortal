"use client";

import { useState } from "react";
import { Button } from "./Button";

/**
 * Displays a generated invite link with a one-click copy button. The admin
 * (or org owner) sends this to the invitee however they like.
 */
export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the input is selectable as a fallback.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 truncate rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-muted focus:border-accent focus:outline-none"
      />
      <Button type="button" size="sm" variant="secondary" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
