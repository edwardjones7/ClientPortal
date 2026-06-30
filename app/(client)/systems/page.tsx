import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { SystemCard } from "@/components/systems/SystemCard";
import { requireMember } from "@/lib/auth";
import { SYSTEMS } from "@/lib/systems";

export const metadata: Metadata = { title: "Systems" };

export default async function SystemsPage() {
  await requireMember();

  return (
    <div>
      <PageHeading
        no="01"
        title="The Book of Systems"
        description="The catalog of systems Elenos designs, builds, and runs for businesses. Browse what's possible."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SYSTEMS.map((system) => (
          <SystemCard key={system.slug} system={system} />
        ))}
      </div>

      <Panel className="mt-6 px-5 py-4">
        <p className="text-sm text-muted">
          See something you&apos;d want for your business? Open a ticket and
          we&apos;ll scope it with you.
        </p>
      </Panel>
    </div>
  );
}
