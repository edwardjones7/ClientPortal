import { cx } from "@/lib/utils";
import { initials } from "@/lib/utils";

/** Initials chip. `accent` marks the Elenos side of a conversation. */
export function Avatar({
  name,
  accent = false,
  className,
}: {
  name: string | null | undefined;
  accent?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
        accent
          ? "bg-accent/15 text-accent-fg border border-accent/30"
          : "bg-surface-2 text-muted border border-border",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
