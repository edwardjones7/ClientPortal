import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

/** A bordered surface — the base container for content blocks. */
export function Panel({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={cx(
        "rounded-lg border border-border bg-surface",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
