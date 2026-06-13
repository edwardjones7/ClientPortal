import type { ReactNode } from "react";

/**
 * Page heading with an Elenos numbered section marker (01 / Tickets).
 * Sentence case title. Optional right-aligned action slot.
 */
export function PageHeading({
  no,
  title,
  description,
  action,
}: {
  no: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="section-no mb-2">
          {no} <span className="text-faint">/ {title}</span>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
