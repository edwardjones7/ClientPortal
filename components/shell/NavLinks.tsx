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

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 md:flex-col">
      {items.map((item) => {
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
    </nav>
  );
}
