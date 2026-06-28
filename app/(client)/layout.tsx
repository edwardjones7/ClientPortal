import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { ViewAsBanner } from "@/components/admin/ViewAsBanner";
import type { NavGroup } from "@/components/shell/NavLinks";

const NAV: NavGroup[] = [
  { items: [{ href: "/", label: "Dashboard", exact: true }] },
  {
    label: "Workspace",
    items: [
      { href: "/tickets", label: "Tickets" },
      { href: "/chat", label: "Chat" },
    ],
  },
  {
    label: "Resources",
    items: [
      { href: "/systems", label: "Systems" },
      { href: "/academy", label: "Academy" },
    ],
  },
  { footer: true, items: [{ href: "/settings", label: "Settings" }] },
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

  // Admins only reach (client) pages when previewing via "view as client".
  const previewing = user.profile.role === "admin";

  return (
    <AppShell
      nav={NAV}
      eyebrow={org?.name ?? "Client"}
      userName={user.profile.full_name}
      userEmail={user.email}
    >
      {previewing ? <ViewAsBanner orgName={org?.name ?? "this client"} /> : null}
      {children}
    </AppShell>
  );
}
