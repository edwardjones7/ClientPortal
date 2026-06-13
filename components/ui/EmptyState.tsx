import type { ReactNode } from "react";
import { Panel } from "./Panel";

/**
 * On-brand empty state. Copy stays in the Elenos voice: short, declarative,
 * no hype, no emoji. "Quiet is good." rather than "You're all caught up!"
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-fg">{title}</p>
      {body ? <p className="mt-1.5 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Panel>
  );
}
