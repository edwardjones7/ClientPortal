import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/NavLinks";

const NAV: NavItem[] = [
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/chat", label: "Chat" },
  { href: "/admin/invites", label: "Invite" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <AppShell
      nav={NAV}
      eyebrow="Admin · Elenos"
      userName={user.profile.full_name}
      userEmail={user.email}
      accentAvatar
    >
      {children}
    </AppShell>
  );
}
