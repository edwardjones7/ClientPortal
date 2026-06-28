import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";

/**
 * A single course tile — thumbnail banner on top, title + description + an
 * optional footer (lesson count, progress, assignment count) below.
 * Presentational; reused by the admin course list and the client academy.
 */
export function CourseCard({
  title,
  description,
  thumbnail,
  footer,
}: {
  title: string;
  description?: string | null;
  thumbnail: string | null;
  footer?: ReactNode;
}) {
  return (
    <Panel
      as="article"
      className="flex h-full flex-col overflow-hidden transition-colors hover:border-border-strong"
    >
      <div className="relative flex h-40 items-center justify-center border-b border-border bg-gradient-to-br from-surface-2 to-elevated">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote provider thumbnail / public bucket URL; avoids next/image remote config
          <img
            src={thumbnail}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden
          />
        ) : (
          <span className="text-2xl font-semibold text-faint" aria-hidden>
            {title.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-fg">{title}</h3>
        {description ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-muted">{description}</p>
        ) : null}
        {footer ? <div className="mt-3 pt-1">{footer}</div> : null}
      </div>
    </Panel>
  );
}
