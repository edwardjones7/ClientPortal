import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { SystemCard } from "@/components/systems/SystemCard";
import { requireAdmin } from "@/lib/auth";
import { SYSTEMS } from "@/lib/systems";

export const metadata: Metadata = { title: "Systems" };

export default async function AdminSystemsPage() {
  await requireAdmin();

  return (
    <div>
      <PageHeading
        no="01"
        title="Systems"
        description="The systems Elenos offers — exactly as clients see them in their portal."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SYSTEMS.map((system) => (
          <SystemCard key={system.slug} system={system} />
        ))}
      </div>

      <Panel className="mt-6 px-5 py-4">
        <p className="text-sm text-muted">
          More systems are on the way — we&apos;ll add them here as they go
          live.
        </p>
      </Panel>
    </div>
  );
}
