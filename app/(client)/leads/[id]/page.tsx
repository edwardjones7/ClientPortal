import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { ButtonLink } from "@/components/ui/Button";
import { requireMember } from "@/lib/auth";
import { fetchRepLead, type PainSignal } from "@/lib/lead-engine";
import { cx } from "@/lib/utils";

export const metadata: Metadata = { title: "Lead" };

const TIMING_TONE: Record<string, string> = {
  hot: "text-danger",
  warm: "text-waiting",
  nurture: "text-progress",
};

const STRENGTH_TONE: Record<string, string> = {
  strong: "text-danger",
  moderate: "text-waiting",
  weak: "text-faint",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-faint">
      {children}
    </p>
  );
}

function Brief({
  title,
  body,
}: {
  title: string;
  body: string | null;
}) {
  if (!body) return null;
  return (
    <Panel className="p-6">
      <SectionTitle>{title}</SectionTitle>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
        {body}
      </p>
    </Panel>
  );
}

export default async function RepLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireMember();
  if (!user.isEmployee) redirect("/");
  const { id } = await params;

  const result = await fetchRepLead(id, user.email);
  if (!result.ok) notFound();
  const lead = result.data;

  const name =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
    lead.companyName;
  const subtitle = [
    lead.title,
    lead.companyName,
    lead.companyLocation,
  ]
    .filter(Boolean)
    .join(" · ");

  const signals = lead.painSignals.map((s) =>
    typeof s === "string" ? ({ signal: s } as PainSignal) : s,
  );

  return (
    <div className="max-w-2xl">
      <PageHeading
        no="01"
        title={name}
        description={subtitle || undefined}
        action={
          <ButtonLink href="/leads" variant="ghost" size="sm">
            ← Leads
          </ButtonLink>
        }
      />

      {/* Snapshot */}
      <Panel className="mb-4 grid gap-5 p-6 sm:grid-cols-3">
        <div>
          <SectionTitle>ICP score</SectionTitle>
          {lead.icpScore != null ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-fg">
                {Math.round(lead.icpScore)}
                <span className="text-sm font-normal text-faint"> / 100</span>
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: `${Math.min(100, Math.max(0, Math.round(lead.icpScore)))}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-faint">Not scored</p>
          )}
        </div>
        <div>
          <SectionTitle>Timing</SectionTitle>
          <p
            className={cx(
              "text-sm font-medium capitalize",
              TIMING_TONE[lead.timingScore ?? ""] ?? "text-muted",
            )}
          >
            {lead.timingScore ?? "—"}
          </p>
          {lead.tier ? (
            <p className="mt-1 text-xs text-faint">Priority {lead.tier}</p>
          ) : null}
        </div>
        <div>
          <SectionTitle>Contact</SectionTitle>
          <div className="space-y-1 text-sm">
            {lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                className="block text-accent-fg hover:underline"
              >
                {lead.phone}
              </a>
            ) : null}
            {lead.email ? (
              <a
                href={`mailto:${lead.email}`}
                className="block break-all text-accent-fg hover:underline"
              >
                {lead.email}
              </a>
            ) : null}
            {lead.companyDomain ? (
              <a
                href={`https://${lead.companyDomain}`}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-accent-fg hover:underline"
              >
                {lead.companyDomain}
              </a>
            ) : null}
            {lead.linkedinUrl ? (
              <a
                href={lead.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-accent-fg hover:underline"
              >
                LinkedIn
              </a>
            ) : null}
            {!lead.phone && !lead.email && !lead.companyDomain && !lead.linkedinUrl ? (
              <p className="text-faint">—</p>
            ) : null}
          </div>
        </div>
      </Panel>

      <div className="space-y-4">
        <Brief title="Recommended angle" body={lead.recommendedAngle} />

        {signals.length > 0 ? (
          <Panel className="p-6">
            <SectionTitle>Pain signals</SectionTitle>
            <ul className="space-y-3">
              {signals.map((s, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm text-fg">{s.signal}</p>
                    {s.source ? (
                      <p className="mt-0.5 text-xs text-faint">
                        Source: {s.source}
                      </p>
                    ) : null}
                  </div>
                  {s.strength ? (
                    <span
                      className={cx(
                        "shrink-0 text-xs font-medium capitalize",
                        STRENGTH_TONE[s.strength] ?? "text-faint",
                      )}
                    >
                      {s.strength}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        <Brief title="Company brief" body={lead.companyBrief} />
        <Brief title="Contact brief" body={lead.contactBrief} />
        <Brief title="Competitive intelligence" body={lead.competitiveIntel} />
        <Brief title="Why this score" body={lead.icpScoreReasoning} />
        <Brief title="Notes from Elenos" body={lead.notes} />

        {lead.triggerEvents.length > 0 ? (
          <Panel className="p-6">
            <SectionTitle>Trigger events</SectionTitle>
            <ul className="space-y-2">
              {lead.triggerEvents.map((e, i) => (
                <li key={i} className="text-sm text-muted">
                  <span className="text-fg">{e.title || e.type || "Event"}</span>
                  {e.date ? (
                    <span className="text-xs text-faint"> · {e.date}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {lead.techStack.length > 0 ? (
          <Panel className="p-6">
            <SectionTitle>Tech stack</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {lead.techStack.map((t, i) => (
                <span
                  key={i}
                  className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-muted"
                >
                  {String(t)}
                </span>
              ))}
            </div>
          </Panel>
        ) : null}

        {lead.companyDescription ? (
          <Brief title="Company description" body={lead.companyDescription} />
        ) : null}
      </div>

      <p className="meta mt-6">
        Read-only brief from Elenos · log your touches on the Outreach sheet
      </p>
    </div>
  );
}
