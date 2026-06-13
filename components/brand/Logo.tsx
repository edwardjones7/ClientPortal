import { cx } from "@/lib/utils";

/**
 * ELENOS wordmark. All caps in logo/footer contexts per brand rules.
 * The trailing dot is set in the accent color — a small signature.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "font-mono text-sm font-semibold tracking-[0.2em] text-fg select-none",
        className,
      )}
    >
      ELENOS<span className="text-accent">.</span>
    </span>
  );
}
