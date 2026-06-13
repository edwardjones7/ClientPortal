import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/app/(auth)/actions";
import { NavLinks, type NavItem } from "./NavLinks";

/**
 * Shared layout for the authenticated app. Left sidebar on md+, top bar on
 * mobile. `eyebrow` shows the context line (org name, or "Admin").
 */
export function AppShell({
  nav,
  eyebrow,
  userName,
  userEmail,
  accentAvatar = false,
  children,
}: {
  nav: NavItem[];
  eyebrow: string;
  userName: string | null;
  userEmail: string;
  accentAvatar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col border-border md:w-60 md:border-r">
        <div className="flex items-center justify-between px-5 py-5 md:block">
          <Logo />
          <p className="meta mt-0 md:mt-3">{eyebrow}</p>
        </div>

        <div className="overflow-x-auto px-3 pb-3 md:flex-1 md:overflow-visible">
          <NavLinks items={nav} />
        </div>

        <div className="hidden items-center gap-3 border-t border-border px-5 py-4 md:flex">
          <Avatar name={userName} accent={accentAvatar} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-fg">{userName ?? userEmail}</p>
            <p className="truncate text-xs text-faint">{userEmail}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-muted hover:text-fg"
              title="Sign out"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-5 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
