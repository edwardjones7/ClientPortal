import { Panel } from "@/components/ui/Panel";

export interface ResourceView {
  id: string;
  title: string | null;
  file_name: string;
  size_bytes: number | null;
  url: string | null;
  thumbnailUrl: string | null;
}

function fileSize(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Downloadable documents attached to a course. Renders nothing if there are none. */
export function CourseResources({ resources }: { resources: ResourceView[] }) {
  if (resources.length === 0) return null;

  return (
    <section className="mt-10">
      <p className="section-no mb-3">02 / Resources</p>
      <Panel className="divide-y divide-border">
        {resources.map((r) => {
          const size = fileSize(r.size_bytes);
          const label = r.title || r.file_name;
          const inner = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-surface-2">
                {r.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-faint">FILE</span>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {label}
              </span>
              {size ? (
                <span className="shrink-0 text-xs text-muted">{size}</span>
              ) : null}
              <span className="shrink-0 text-xs text-accent">Download ↓</span>
            </>
          );
          return r.url ? (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/50"
            >
              {inner}
            </a>
          ) : (
            <div
              key={r.id}
              className="flex items-center gap-3 px-5 py-3 opacity-60"
              title="This file is unavailable right now."
            >
              {inner}
            </div>
          );
        })}
      </Panel>
    </section>
  );
}
