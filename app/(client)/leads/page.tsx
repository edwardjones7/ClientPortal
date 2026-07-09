import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireMember, getViewAsRepEmail } from "@/lib/auth";
import { fetchRepLeads } from "@/lib/lead-engine";
import { cx } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads" };

const TIMING_TONE: Record<string, string> = {
  hot: "text-danger",
  warm: "text-waiting",
  nurture: "text-progress",
};

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default async function RepLeadsPage() {
  const user = await requireMember();
  if (!user.isEmployee) redirect("/");

  // Admin previews resolve the leads by the chosen employee's email.
  const sheetEmail =
    user.profile.role === "admin" ? await getViewAsRepEmail() : user.email;
  if (!sheetEmail) {
    return (
      <div>
        <PageHeading no="01" title="Leads" />
        <Panel className="p-6">
          <p className="text-sm text-muted">
            Pick a team member on Admin &gt; Team (&quot;View as&quot;) to
            preview their leads.
          </p>
        </Panel>
      </div>
    );
  }

  const result = await fetchRepLeads(sheetEmail);

  if (!result.ok) {
    return (
      <div>
        <PageHeading no="01" title="Leads" />
        <Panel className="p-6">
          <p className="text-sm text-muted">{result.error}</p>
        </Panel>
      </div>
    );
  }

  const leads = result.data;

  return (
    <div>
      <PageHeading
        no="01"
        title="Leads"
        description={`The full brief behind each prospect on your sheet — ${leads.length} lead${leads.length === 1 ? "" : "s"}, read-only.`}
      />

      {leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          body="When Elenos pushes a prospect to your sheet, its full lead brief lands here."
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Lead", "Company", "Location", "ICP", "Timing", "Enriched"].map(
                  (h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-faint"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-surface-2/60"
                >
                  <td className="px-0 py-0">
                    <Link
                      href={`/leads/${l.id}`}
                      className="block px-4 py-3 font-medium text-fg"
                    >
                      {[l.firstName, l.lastName].filter(Boolean).join(" ") ||
                        l.companyName}
                      {l.title ? (
                        <span className="block text-xs font-normal text-faint">
                          {l.title}
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {l.companyName}
                    {l.industry ? (
                      <span className="block text-xs text-faint">
                        {l.industry}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {cell(l.companyLocation)}
                  </td>
                  <td className="px-4 py-3">
                    {l.icpScore != null ? (
                      <span className="font-semibold tabular-nums text-fg">
                        {Math.round(l.icpScore)}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cx(
                        "capitalize",
                        TIMING_TONE[l.timingScore ?? ""] ?? "text-muted",
                      )}
                    >
                      {cell(l.timingScore)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {l.enrichedAt ? (
                      <span className="text-resolved">Yes</span>
                    ) : (
                      <span className="text-faint">Not yet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <p className="meta mt-4">
        Open a lead for the full brief · read-only — work the prospect from
        your Outreach sheet
      </p>
    </div>
  );
}
