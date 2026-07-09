import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { toggleAssignmentVisibility } from "@/app/(admin)/actions";
import { fetchTeamAssignments, type TeamAssignment } from "@/lib/lead-engine";
import { cx } from "@/lib/utils";

export const metadata: Metadata = { title: "Team Leads" };

const STATUS_TONE: Record<string, string> = {
  New: "text-open",
  Booked: "text-resolved",
  Dead: "text-faint",
};

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default async function TeamLeadsPage() {
  const result = await fetchTeamAssignments();

  if (!result.ok) {
    return (
      <div className="max-w-4xl">
        <PageHeading no="01" title="Team leads" />
        <Panel className="p-6">
          <p className="text-sm text-muted">{result.error}</p>
        </Panel>
      </div>
    );
  }

  // Group rows per rep, keeping the lead engine's sheet order.
  const byRep = new Map<string, { name: string; rows: TeamAssignment[] }>();
  for (const row of result.data) {
    const key = row.rep?.id ?? "unknown";
    if (!byRep.has(key)) {
      byRep.set(key, { name: row.rep?.name ?? "Unknown rep", rows: [] });
    }
    byRep.get(key)!.rows.push(row);
  }

  const leadEngineUrl = (process.env.LEAD_ENGINE_URL ?? "").replace(/\/$/, "");
  const total = result.data.length;
  const hidden = result.data.filter((r) => r.hiddenFromRep).length;

  return (
    <div className="max-w-4xl">
      <PageHeading
        no="01"
        title="Team leads"
        description={`Everything you've pushed to the team — ${total} row${total === 1 ? "" : "s"}${hidden ? `, ${hidden} removed from rep view` : ""}. Removing a lead hides it from the rep's sheet and Leads tab; you keep the row and their activity.`}
      />

      {byRep.size === 0 ? (
        <EmptyState
          title="No team leads yet"
          body="Push a lead to a rep's sheet from the lead engine and it shows up here."
        />
      ) : (
        <div className="space-y-8">
          {Array.from(byRep.values()).map((group) => (
            <section key={group.name}>
              <p className="section-no mb-3">
                {group.name}{" "}
                <span className="text-faint">
                  / {group.rows.length} lead{group.rows.length === 1 ? "" : "s"}
                </span>
              </p>
              <Panel className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      {["Business", "Status", "Touches", "Last touch", "Outcome", ""].map(
                        (h, i) => (
                          <th
                            key={i}
                            className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-faint"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr
                        key={row.id}
                        className={cx(
                          "border-b border-border/60 last:border-b-0",
                          row.hiddenFromRep && "opacity-50",
                        )}
                      >
                        <td className="px-4 py-3">
                          {leadEngineUrl && row.leadId ? (
                            <a
                              href={`${leadEngineUrl}/leads/${row.leadId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-fg hover:text-accent-fg hover:underline"
                              title="Open in the lead engine"
                            >
                              {row.businessName || "Untitled"}
                            </a>
                          ) : (
                            <span className="font-medium text-fg">
                              {row.businessName || "Untitled"}
                            </span>
                          )}
                          {row.hiddenFromRep ? (
                            <span className="ml-2 text-xs text-waiting">
                              removed from rep view
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={STATUS_TONE[row.status] ?? "text-muted"}>
                            {cell(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {row.touchCount ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                          {cell(row.lastTouch)}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {cell(row.outcome)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <form
                            action={toggleAssignmentVisibility.bind(
                              null,
                              row.id,
                              !row.hiddenFromRep,
                            )}
                          >
                            <Button
                              type="submit"
                              variant={row.hiddenFromRep ? "secondary" : "danger"}
                              size="sm"
                            >
                              {row.hiddenFromRep ? "Restore" : "Remove"}
                            </Button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
