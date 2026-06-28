"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  /** Match this exact path only (e.g. the index link). */
  exact?: boolean;
}

export interface NavGroup {
  /** Optional uppercase section header. Omit for ungrouped items (no header). */
  label?: string;
  items: NavItem[];
  /** Pin to the bottom of the sidebar with a divider (desktop only). */
  footer?: boolean;
}

/** NavLinks accepts a flat list (legacy / admin) or grouped sections. */
export type NavInput = NavItem[] | NavGroup[];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isGrouped(input: NavInput): input is NavGroup[] {
  // A NavGroup has `items`; a NavItem has `href`. Empty => grouped (renders nothing).
  return input.length === 0 || "items" in input[0];
}

/** Normalize either shape into NavGroup[] so rendering has one code path. */
function toGroups(input: NavInput): NavGroup[] {
  return isGrouped(input) ? input : [{ items: input }];
}

export function NavLinks({ items }: { items: NavInput }) {
  const pathname = usePathname();
  const groups = toGroups(items);

  return (
    <nav className="flex gap-1 md:flex-col">
      {groups.map((group, i) => (
        // `contents` on mobile drops the wrapper box so each link flows into
        // the horizontal scroll bar; `block` on md+ makes it a real section.
        <div
          key={group.label ?? group.items[0]?.href ?? i}
          className={cx(
            "contents md:block",
            !group.footer && "md:not-first:mt-4",
            group.footer && "md:mt-auto md:border-t md:border-border md:pt-3",
          )}
        >
          {group.label ? (
            <p className="meta hidden px-3 pb-1 md:block">{group.label}</p>
          ) : null}

          <div className="contents md:flex md:flex-col md:gap-1">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "rounded-md px-3 py-2 text-sm transition-colors whitespace-nowrap",
                    active
                      ? "bg-surface-2 text-fg"
                      : "text-muted hover:text-fg hover:bg-surface-2/60",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cx(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        active ? "bg-accent" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
