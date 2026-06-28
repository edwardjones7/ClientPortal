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
        title="The Book of Systems"
        description="The full catalog of systems Elenos offers — exactly as clients browse it in their portal."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SYSTEMS.map((system) => (
          <SystemCard key={system.slug} system={system} />
        ))}
      </div>

      <Panel className="mt-6 px-5 py-4">
        <p className="text-sm text-muted">
          The catalog is shared across every client. Edit the list in{" "}
          <code className="text-fg">lib/systems.ts</code>.
        </p>
      </Panel>
    </div>
  );
}
