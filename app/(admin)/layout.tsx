import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/shell/AppShell";
import type { NavGroup } from "@/components/shell/NavLinks";

const NAV: NavGroup[] = [
  { items: [{ href: "/admin/clients", label: "Clients" }] },
  {
    label: "Workspace",
    items: [
      { href: "/admin/tickets", label: "Tickets" },
      { href: "/admin/chat", label: "Chat" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/admin/systems", label: "Systems" },
      { href: "/admin/courses", label: "Academy" },
    ],
  },
  { footer: true, items: [{ href: "/admin/invites", label: "Invite" }] },
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
