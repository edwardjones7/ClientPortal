"use server";

import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SIM_PASS_PCT, SIM_QUESTIONS } from "@/lib/call-sim";

/**
 * Employee: record a completed full run of the Live Call Simulator so admins
 * can see pass/fail on the Team page. Score/pct/passed are recomputed here
 * rather than trusted from the client payload.
 *
 * No-ops for admins — an admin previewing via "view as employee" has no org of
 * their own (current_org_id() is null), so a write would fail RLS anyway and
 * we don't want preview runs polluting the team's results.
 */
export async function recordSimAttempt(input: {
  score: number;
  total: number;
  durationMs: number;
  timedOut: number;
  breakdown: Record<string, { right: number; total: number }>;
}): Promise<void> {
  const user = await getSessionUser();
  if (!user || user.profile.role === "admin" || !user.profile.org_id) return;

  const total = Math.trunc(input.total);
  const score = Math.min(Math.max(Math.trunc(input.score), 0), total);
  // Only full runs count toward certification — drills aren't recorded.
  if (total !== SIM_QUESTIONS.length) return;

  const pct = Math.round((score / total) * 100);

  await createClient().then((supabase) =>
    supabase.from("sim_attempts").insert({
      profile_id: user.id,
      org_id: user.profile.org_id,
      score,
      total,
      pct,
      passed: pct >= SIM_PASS_PCT,
      duration_ms: Math.max(0, Math.trunc(input.durationMs)) || 0,
      timed_out: Math.min(Math.max(Math.trunc(input.timedOut), 0), total),
      breakdown: input.breakdown ?? null,
    }),
  );
}
