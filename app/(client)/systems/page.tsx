import type { Metadata } from "next";
import { PageHeading } from "@/components/brand/PageHeading";
import { Panel } from "@/components/ui/Panel";
import { SystemCard } from "@/components/systems/SystemCard";
import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SYSTEMS } from "@/lib/systems";

export const metadata: Metadata = { title: "Systems" };

export default async function SystemsPage() {
  const user = await requireClient();
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", user.orgId)
    .single();

  return (
    <div>
      <PageHeading
        no="01"
        title="Systems"
        description={`The systems Elenos runs for ${org?.name ?? "your team"}. Live now, with more on the way.`}
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
