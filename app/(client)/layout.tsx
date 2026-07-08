import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { ViewAsBanner } from "@/components/admin/ViewAsBanner";
import type { NavGroup } from "@/components/shell/NavLinks";

// Clients get the full portal.
const CLIENT_NAV: NavGroup[] = [
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

// Employees (internal staff) see their training, their outreach sheet, and a
// direct line to Elenos.
const EMPLOYEE_NAV: NavGroup[] = [
  { items: [{ href: "/", label: "Dashboard", exact: true }] },
  {
    label: "Sales",
    items: [
      { href: "/outreach", label: "Outreach" },
      { href: "/leads", label: "Leads" },
    ],
  },
  {
    label: "Training",
    items: [{ href: "/academy", label: "Academy" }],
  },
  {
    label: "Resources",
    items: [{ href: "/systems", label: "Systems" }],
  },
  {
    label: "Workspace",
    items: [{ href: "/chat", label: "Chat" }],
  },
  { footer: true, items: [{ href: "/settings", label: "Settings" }] },
];

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireMember();
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", user.orgId)
    .single();

  const isEmployee = user.isEmployee;
  // Admins only reach these pages when previewing via "view as client/employee".
  const previewing = user.profile.role === "admin";

  return (
    <AppShell
      nav={isEmployee ? EMPLOYEE_NAV : CLIENT_NAV}
      eyebrow={org?.name ?? (isEmployee ? "Elenos Team" : "Client")}
      userName={user.profile.full_name}
      userEmail={user.email}
    >
      {previewing ? (
        <ViewAsBanner
          orgName={org?.name ?? (isEmployee ? "an employee" : "this client")}
          isEmployee={isEmployee}
        />
      ) : null}
      {children}
    </AppShell>
  );
}
