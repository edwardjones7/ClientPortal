import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import type { NavItem } from "@/components/shell/NavLinks";

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/systems", label: "Systems" },
  { href: "/tickets", label: "Tickets" },
  { href: "/chat", label: "Chat" },
  { href: "/settings", label: "Settings" },
];

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireClient();
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", user.orgId)
    .single();

  return (
    <AppShell
      nav={NAV}
      eyebrow={org?.name ?? "Client"}
      userName={user.profile.full_name}
      userEmail={user.email}
    >
      {children}
    </AppShell>
  );
}
