import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { LogTouchForm } from "@/components/rep/LogTouchForm";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { fetchRepSheet } from "@/lib/lead-engine";

export const metadata: Metadata = { title: "Prospect" };

function Fact({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-faint">
        {name}
      </p>
      <p className="text-sm text-fg">{children}</p>
    </div>
  );
}

export default async function ProspectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireMember();
  if (!user.isEmployee) redirect("/");
  const { id } = await params;

  // One call returns the rep's whole sheet; ownership is enforced by the
  // lead engine — a row that isn't theirs simply isn't in the list.
  const result = await fetchRepSheet(user.email);
  if (!result.ok) notFound();
  const row = result.data.prospects.find((p) => p.id === id);
  if (!row) notFound();

  const subtitle = [
    row.vertical,
    [row.city, row.state].filter(Boolean).join(", "),
    row.priority ? `Priority ${row.priority}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-2xl">
      <PageHeading
        no="01"
        title={row.businessName || "Untitled prospect"}
        description={subtitle || undefined}
        action={
          <ButtonLink href="/outreach" variant="ghost" size="sm">
            ← Your sheet
          </ButtonLink>
        }
      />

      {/* The brief */}
      <Panel className="mb-4 grid gap-5 p-6 sm:grid-cols-2">
        <Fact name="Owner / contact">{row.ownerContact || "—"}</Fact>
        <Fact name="Phone">
          {row.phone ? (
            <a href={`tel:${row.phone}`} className="text-accent-fg hover:underline">
              {row.phone}
            </a>
          ) : (
            "—"
          )}
        </Fact>
        <Fact name="Email">
          {row.email ? (
            <a href={`mailto:${row.email}`} className="text-accent-fg hover:underline">
              {row.email}
            </a>
          ) : (
            "—"
          )}
        </Fact>
        <Fact name="Website">
          {row.websiteUrl ? (
            <a
              href={row.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent-fg hover:underline"
            >
              {row.websiteUrl.replace(/^https?:\/\//, "")}
            </a>
          ) : (
            "—"
          )}
        </Fact>
        <div className="sm:col-span-2">
          <Fact name="Pain signal">{row.painSignal || "—"}</Fact>
        </div>
        {row.prospectNotes ? (
          <div className="sm:col-span-2">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-faint">
              Notes from Elenos
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {row.prospectNotes}
            </p>
          </div>
        ) : null}
      </Panel>

      {/* Activity so far */}
      <Panel className="mb-4 grid gap-5 p-6 sm:grid-cols-3">
        <Fact name="Status">{row.status}</Fact>
        <Fact name="Touches">{row.touchCount ?? 0}</Fact>
        <Fact name="Last touch">{row.lastTouch || "—"}</Fact>
        {row.activityNotes ? (
          <div className="sm:col-span-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-faint">
              Activity log
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {row.activityNotes}
            </p>
          </div>
        ) : null}
      </Panel>

      {/* Log a touch */}
      <Panel className="p-6">
        <h2 className="mb-4 text-base font-semibold text-fg">Log a touch</h2>
        <LogTouchForm
          rowId={row.id}
          status={row.status}
          channel={row.channel}
          touchCount={row.touchCount ?? 0}
          hadFirstTouch={!!row.firstTouch}
          existingNotes={row.activityNotes ?? ""}
        />
      </Panel>
    </div>
  );
}
