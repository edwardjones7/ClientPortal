import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { fetchRepSheet } from "@/lib/lead-engine";
import { cx } from "@/lib/utils";

export const metadata: Metadata = { title: "Outreach" };

const PRIORITY_TONE: Record<string, string> = {
  A: "text-resolved",
  B: "text-waiting",
  C: "text-faint",
};

const STATUS_TONE: Record<string, string> = {
  New: "text-open",
  Booked: "text-resolved",
  Dead: "text-faint",
};

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default async function OutreachPage() {
  const user = await requireMember();
  if (!user.isEmployee) redirect("/");
  const result = await fetchRepSheet(user.email);

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

  const rows = result.data.prospects;
  const worked = rows.filter((r) => (r.touchCount ?? 0) > 0).length;
  const booked = rows.filter((r) => r.status === "Booked").length;

  return (
    <div>
      <PageHeading
        no="01"
        title="Outreach"
        description={`${rows.length} prospect${rows.length === 1 ? "" : "s"} on your sheet · ${worked} worked · ${booked} booked`}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing on your sheet yet"
          body="New prospects land here as Elenos assigns them to you."
        />
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Business", "Location", "Priority", "Status", "Touches", "Last touch", "Next step"].map(
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
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/60 last:border-b-0 hover:bg-surface-2/60"
                >
                  <td className="px-0 py-0">
                    <Link
                      href={`/outreach/${r.id}`}
                      className="block px-4 py-3 font-medium text-fg"
                    >
                      {r.businessName || "Untitled"}
                      {r.vertical ? (
                        <span className="block text-xs font-normal text-faint">
                          {r.vertical}
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {cell([r.city, r.state].filter(Boolean).join(", "))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cx(
                        "font-semibold",
                        PRIORITY_TONE[r.priority ?? ""] ?? "text-muted",
                      )}
                    >
                      {cell(r.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={STATUS_TONE[r.status] ?? "text-muted"}>
                      {cell(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{r.touchCount ?? 0}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {cell(r.lastTouch)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {cell(r.nextStep)}
                    {r.nextStepDate ? (
                      <span className="text-xs text-faint"> · {r.nextStepDate}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <p className="meta mt-4">
        Open a prospect for the full brief · log every touch — it syncs back to
        Elenos
      </p>
    </div>
  );
}
