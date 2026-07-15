import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { OutreachSheet } from "@/components/rep/OutreachSheet";
import { requireMember, getViewAsRepEmail } from "@/lib/auth";
import { fetchRepSheet } from "@/lib/lead-engine";
import { ensureLocalRows, fetchLocalRowsByEmail } from "@/lib/rep-rows";

export const metadata: Metadata = { title: "Outreach" };

export default async function OutreachPage() {
  const user = await requireMember();
  if (!user.isEmployee) redirect("/");

  // Admin previews resolve the sheet by the chosen employee's email,
  // and render it read-only.
  const previewing = user.profile.role === "admin";
  const sheetEmail = previewing ? await getViewAsRepEmail() : user.email;
  if (!sheetEmail) {
    return (
      <div>
        <PageHeading no="01" title="Outreach" />
        <Panel className="p-6">
          <p className="text-sm text-muted">
            Pick a team member on Admin &gt; Team (&quot;View as&quot;) to
            preview their sheet.
          </p>
        </Panel>
      </div>
    );
  }

  const result = await fetchRepSheet(sheetEmail);

  if (!result.ok) {
    return (
      <div>
        <PageHeading no="01" title="Outreach" />
        <Panel className="p-6">
          <p className="text-sm text-muted">{result.error}</p>
        </Panel>
      </div>
    );
  }

  // The rep's own rows (the blank outline they fill in themselves) sit
  // below the lead-engine assignments. First visit seeds the blanks;
  // previews only read what the rep already has.
  const localRows = previewing
    ? await fetchLocalRowsByEmail(sheetEmail)
    : await ensureLocalRows(user.id);
  const rows = [...result.data.prospects, ...localRows];

  const filled = rows.filter(
    (r) => !r.local || r.businessName.trim() !== "",
  ).length;
  const worked = rows.filter((r) => (r.touchCount ?? 0) > 0).length;
  const booked = rows.filter((r) => r.status === "Booked").length;

  return (
    <div>
      <PageHeading
        no="01"
        title="Outreach"
        description={`${filled} prospect${filled === 1 ? "" : "s"} on your sheet · ${worked} worked · ${booked} booked`}
      />
      <OutreachSheet
        rows={rows}
        readOnly={previewing}
        canAddRows={!previewing}
      />
    </div>
  );
}
