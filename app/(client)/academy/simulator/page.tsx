import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeading } from "@/components/brand/PageHeading";
import { CallSimulator } from "@/components/training/CallSimulator";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SimAttempt } from "@/lib/types";

export const metadata: Metadata = { title: "Call Simulator" };

/**
 * The Live Call Simulator — employee-only training, reached from its card on
 * the Academy page. Clients never see this (the Academy hides the card and
 * this guard enforces it); an admin can preview via "view as employee"
 * (runs aren't recorded).
 */
export default async function SimulatorPage() {
  const user = await requireMember();
  if (!user.isEmployee) redirect("/academy");

  const supabase = await createClient();
  const { data: attempts } = await supabase
    .from("sim_attempts")
    .select("pct, passed")
    .eq("profile_id", user.id)
    .returns<Pick<SimAttempt, "pct" | "passed">[]>();

  const attemptCount = attempts?.length ?? 0;
  const bestPct = attemptCount
    ? Math.max(...attempts!.map((a) => a.pct))
    : null;
  const certified = (attempts ?? []).some((a) => a.passed);

  return (
    <div>
      <Link
        href="/academy"
        className="meta mb-4 inline-block hover:text-muted"
      >
        ← Academy
      </Link>
      <PageHeading
        no="01"
        title="Call simulator"
        description="50 timed callers, straight from real conversations. Answer to the playbook standard — 90%+ earns your Live Call Certification."
      />
      <CallSimulator
        repName={user.profile.full_name ?? user.email}
        certified={certified}
        bestPct={bestPct}
        attemptCount={attemptCount}
        isPreview={user.profile.role === "admin"}
      />
    </div>
  );
}
