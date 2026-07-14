"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { cx } from "@/lib/utils";
import {
  SIM_CATEGORIES,
  SIM_PASS_PCT,
  SIM_QUESTIONS,
  SIM_SECONDS_PER_QUESTION,
  formatSimDuration,
} from "@/lib/call-sim";
import { recordSimAttempt } from "@/app/(client)/academy/simulator/actions";

interface Answer {
  qIndex: number;
  picked: number | null;
  correct: boolean;
  timedOut: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LETTERS = ["A", "B", "C", "D"];

/**
 * The Live Call Simulator — 50 timed objection-handling questions for sales
 * reps. Full runs are recorded via `recordSimAttempt` so admins can see
 * pass/fail on the Team page; "drill what I missed" runs are practice only.
 */
export function CallSimulator({
  repName,
  certified,
  bestPct,
  attemptCount,
  isPreview,
}: {
  repName: string;
  /** Whether any previous recorded attempt passed. */
  certified: boolean;
  bestPct: number | null;
  attemptCount: number;
  /** True for an admin previewing as an employee — runs aren't recorded. */
  isPreview: boolean;
}) {
  const router = useRouter();

  const [screen, setScreen] = useState<"start" | "quiz" | "results">("start");
  const [order, setOrder] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [optOrder, setOptOrder] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SIM_SECONDS_PER_QUESTION);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startMsRef = useRef(0);
  const isFullRunRef = useRef(true);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const qIndex = order[idx];
  const question = qIndex != null ? SIM_QUESTIONS[qIndex] : null;

  const startQuiz = useCallback((indices: number[]) => {
    isFullRunRef.current = indices.length === SIM_QUESTIONS.length;
    const shuffled = shuffle(indices);
    setOrder(shuffled);
    setIdx(0);
    setScore(0);
    setAnswers([]);
    setOptOrder(shuffle(SIM_QUESTIONS[shuffled[0]].opts.map((_, i) => i)));
    setPicked(null);
    setLocked(false);
    setTimedOut(false);
    setTimeLeft(SIM_SECONDS_PER_QUESTION);
    startMsRef.current = Date.now();
    setScreen("quiz");
    window.scrollTo({ top: 0 });
  }, []);

  // Countdown — pauses once the question is answered or timed out.
  useEffect(() => {
    if (screen !== "quiz" || locked) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [screen, locked, idx]);

  // Time ran out — count it as a miss.
  useEffect(() => {
    if (screen !== "quiz" || locked || timeLeft > 0 || !question) return;
    setLocked(true);
    setTimedOut(true);
    setPicked(null);
    setAnswers((a) => [
      ...a,
      { qIndex: qIndex!, picked: null, correct: false, timedOut: true },
    ]);
  }, [screen, locked, timeLeft, question, qIndex]);

  useEffect(() => {
    if (locked) nextBtnRef.current?.focus();
  }, [locked]);

  function pick(origIdx: number) {
    if (locked || !question) return;
    const correct = origIdx === question.a;
    setLocked(true);
    setPicked(origIdx);
    if (correct) setScore((s) => s + 1);
    setAnswers((a) => [
      ...a,
      { qIndex: qIndex!, picked: origIdx, correct, timedOut: false },
    ]);
  }

  function next() {
    const nextIdx = idx + 1;
    if (nextIdx >= order.length) {
      finish();
      return;
    }
    setIdx(nextIdx);
    setOptOrder(shuffle(SIM_QUESTIONS[order[nextIdx]].opts.map((_, i) => i)));
    setPicked(null);
    setLocked(false);
    setTimedOut(false);
    setTimeLeft(SIM_SECONDS_PER_QUESTION);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finish() {
    const duration = Date.now() - startMsRef.current;
    setElapsedMs(duration);
    setScreen("results");
    window.scrollTo({ top: 0 });

    // `answers` is complete here — the Next button only renders after the
    // current question's entry has been committed by pick()/the timeout.
    if (isFullRunRef.current && !isPreview) {
      const breakdown: Record<string, { right: number; total: number }> = {};
      for (const ans of answers) {
        const c = SIM_QUESTIONS[ans.qIndex].cat;
        breakdown[c] = breakdown[c] ?? { right: 0, total: 0 };
        breakdown[c].total++;
        if (ans.correct) breakdown[c].right++;
      }
      void recordSimAttempt({
        score: answers.filter((a) => a.correct).length,
        total: answers.length,
        durationMs: duration,
        timedOut: answers.filter((a) => a.timedOut).length,
        breakdown,
      }).then(() => router.refresh());
    }
  }

  /* ─── Start screen ─────────────────────────────────────────────────── */

  if (screen === "start") {
    return (
      <Panel className="mx-auto max-w-2xl px-6 py-10 text-center sm:px-10">
        <h2 className="text-3xl font-semibold tracking-tight text-fg">
          The phone is ringing.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
          50 real questions prospects and clients actually ask — about price,
          ownership, trust, cancellation, DIY, and everything in between. Pick
          the response the Elenos playbook calls for. On a real call you don’t
          get to think forever, so neither do you here.
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-lg border border-border bg-surface-2 p-4 text-left text-sm">
          <p className="section-no mb-2">The rules</p>
          <ul className="space-y-1 text-muted">
            <li>
              → <span className="text-fg">{SIM_SECONDS_PER_QUESTION} seconds</span>{" "}
              per question — time runs out, it counts as a miss
            </li>
            <li>→ One answer per question, instant feedback</li>
            <li>
              → Score <span className="text-fg">{SIM_PASS_PCT}%+</span> to earn
              your Live Call Certification
            </li>
          </ul>
        </div>

        {attemptCount > 0 ? (
          <p className="mt-5 text-sm">
            {certified ? (
              <span className="text-resolved">
                ✓ Certified — best score {bestPct}%
              </span>
            ) : (
              <span className="text-waiting">
                Best score so far: {bestPct}% · {attemptCount} attempt
                {attemptCount === 1 ? "" : "s"} — you need {SIM_PASS_PCT}%
              </span>
            )}
          </p>
        ) : null}

        {isPreview ? (
          <p className="meta mt-5">
            Preview mode — your run won’t be recorded.
          </p>
        ) : null}

        <div className="mt-7">
          <Button onClick={() => startQuiz(SIM_QUESTIONS.map((_, i) => i))}>
            Answer the call
          </Button>
        </div>
        <p className="meta mt-4">
          Certification requires {SIM_PASS_PCT}% or higher on the full 50.
          {isPreview ? "" : " Every full run is shared with Elenos."}
        </p>
      </Panel>
    );
  }

  /* ─── Quiz screen ──────────────────────────────────────────────────── */

  if (screen === "quiz" && question) {
    const meta = SIM_CATEGORIES[question.cat];
    const timerPct = Math.max(0, (timeLeft / SIM_SECONDS_PER_QUESTION) * 100);
    const timerColor =
      timeLeft <= 10
        ? "var(--color-danger)"
        : timeLeft <= 20
          ? "var(--color-waiting)"
          : "var(--color-resolved)";
    const isLast = idx === order.length - 1;

    return (
      <div className="mx-auto max-w-2xl">
        {/* progress */}
        <div className="mb-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${(idx / order.length) * 100}%` }}
            />
          </div>
          <span className="meta min-w-14 text-right">
            {idx + 1} / {order.length}
          </span>
        </div>

        {/* timer */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{ width: `${timerPct}%`, background: timerColor }}
            />
          </div>
          <span
            className="min-w-8 text-right font-mono text-sm font-semibold tabular-nums"
            style={{ color: timeLeft <= 10 ? "var(--color-danger)" : undefined }}
          >
            {Math.max(0, timeLeft)}
          </span>
        </div>

        <Panel className="p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span
              className="rounded border px-2 py-0.5 font-mono text-[0.68rem] uppercase tracking-wider"
              style={{ color: meta.color, borderColor: "currentcolor" }}
            >
              {meta.label}
            </span>
            <span className="meta">Caller {idx + 1}</span>
            <span className="meta ml-auto tabular-nums">
              Score {score} / {order.length}
            </span>
          </div>

          <div className="mb-5 flex items-start gap-3 rounded-lg border border-border bg-surface-2 p-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-dim text-sm font-bold text-white">
              {question.who.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="meta mb-1">{question.who}</p>
              <p className="text-lg font-semibold leading-snug text-fg">
                “{question.q}”
              </p>
            </div>
          </div>

          <p className="meta mb-3">Your best response:</p>
          <div className="grid gap-2.5">
            {optOrder.map((origIdx, displayIdx) => {
              const isCorrect = locked && origIdx === question.a;
              const isWrong = locked && origIdx === picked && !isCorrect;
              const isDim = locked && !isCorrect && !isWrong;
              return (
                <button
                  key={origIdx}
                  type="button"
                  disabled={locked}
                  onClick={() => pick(origIdx)}
                  className={cx(
                    "flex w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm transition-colors",
                    !locked &&
                      "border-border bg-surface-2 hover:border-accent hover:bg-elevated cursor-pointer",
                    isCorrect && "border-resolved bg-resolved/10",
                    isWrong && "border-danger bg-danger/10",
                    isDim && "border-border bg-surface-2 opacity-50",
                  )}
                >
                  <span
                    className={cx(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold",
                      isCorrect
                        ? "border-resolved bg-resolved text-black"
                        : isWrong
                          ? "border-danger bg-danger text-white"
                          : "border-border-strong text-muted",
                    )}
                  >
                    {LETTERS[displayIdx]}
                  </span>
                  <span className="text-fg/90">{question.opts[origIdx]}</span>
                </button>
              );
            })}
          </div>

          {locked ? (
            <div
              className={cx(
                "mt-5 rounded-lg border-l-4 p-4 text-sm leading-relaxed",
                picked === question.a
                  ? "border-resolved bg-resolved/10"
                  : "border-danger bg-danger/10",
              )}
            >
              <p
                className={cx(
                  "mb-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider",
                  picked === question.a ? "text-resolved" : "text-danger",
                )}
              >
                {timedOut
                  ? "Time’s up — the caller hung up"
                  : picked === question.a
                    ? "Correct"
                    : "Not quite"}
              </p>
              <p className="text-muted">
                {timedOut
                  ? `On a real call, hesitation loses. The answer: ${question.x}`
                  : question.x}
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            {locked ? (
              <Button ref={nextBtnRef} onClick={next}>
                {isLast ? "See my results" : "Next caller"}
              </Button>
            ) : null}
          </div>
        </Panel>
      </div>
    );
  }

  /* ─── Results screen ───────────────────────────────────────────────── */

  const total = order.length;
  const pct = total ? Math.round((score / total) * 100) : 0;
  const fullRun = isFullRunRef.current;
  const passed = pct >= SIM_PASS_PCT && fullRun;
  const missed = answers.filter((a) => !a.correct);
  const timedOutCount = answers.filter((a) => a.timedOut).length;

  const byCat = new Map<string, { right: number; total: number }>();
  for (const a of answers) {
    const c = SIM_QUESTIONS[a.qIndex].cat;
    const row = byCat.get(c) ?? { right: 0, total: 0 };
    row.total++;
    if (a.correct) row.right++;
    byCat.set(c, row);
  }

  const verdict = passed
    ? pct === 100
      ? ["Flawless shift. Every caller handled.", "Fifty real questions, zero misses, on the clock."]
      : ["Certified call-ready.", `You cleared ${SIM_PASS_PCT}% under time pressure. Skim the misses and get on the phones.`]
    : pct >= 75
      ? ["Close — but callers got away.", `You need ${SIM_PASS_PCT}% for certification. Drill the misses below and take another shift.`]
      : pct >= 60
        ? ["You’d survive the shift, barely.", "Too many callers walked. Re-read the objection sections and run it again."]
        : ["Hang up and hit the manual.", "These are the exact questions real prospects ask. Study the playbook, then come back."];

  return (
    <div className="mx-auto max-w-2xl">
      {passed ? (
        <Panel className="mb-6 border-waiting/40 p-6 text-center sm:p-8">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-waiting">
            Live Call Certification
          </p>
          <p className="mt-4 text-sm italic text-muted">This certifies that</p>
          <p className="mt-1 inline-block border-b border-waiting/60 px-6 pb-2 text-3xl font-semibold tracking-tight text-fg">
            {repName}
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted">
            handled <span className="text-fg">50 real customer questions under
            time pressure</span> — pricing, ownership, trust, cancellation, and
            competitive objections — and answered to the Elenos playbook
            standard. <span className="text-fg">Certified call-ready.</span>
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
            <div>
              <p className="text-2xl font-bold tabular-nums text-accent-fg">{pct}%</p>
              <p className="meta">Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-accent-fg">
                {score} / {total}
              </p>
              <p className="meta">Correct</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-accent-fg">
                {formatSimDuration(elapsedMs)}
              </p>
              <p className="meta">Total time</p>
            </div>
          </div>
          <p className="meta mt-5">
            Awarded{" "}
            {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {isPreview ? " · preview — not recorded" : " · recorded for the Elenos team"}
          </p>
        </Panel>
      ) : null}

      <Panel className="p-6 text-center sm:p-8">
        <div
          className="mx-auto grid size-36 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-accent) ${pct}%, var(--color-surface-2) 0)`,
          }}
        >
          <div className="grid size-28 place-items-center rounded-full bg-surface">
            <div>
              <p className="text-3xl font-bold tabular-nums text-fg">{pct}%</p>
              <p className="meta">
                {score} / {total}
              </p>
            </div>
          </div>
        </div>

        <h2 className="mt-4 text-xl font-semibold text-fg">{verdict[0]}</h2>
        <p className="mt-1 text-sm text-muted">{verdict[1]}</p>
        <p className="meta mt-3">
          Total time on the phones: {formatSimDuration(elapsedMs)}
          {timedOutCount > 0
            ? ` · ${timedOutCount} caller${timedOutCount === 1 ? "" : "s"} hung up on you (timeouts)`
            : ""}
          {!fullRun ? " · practice drill — not recorded" : ""}
        </p>

        <div className="mx-auto mt-6 grid max-w-md gap-2.5 text-left">
          {(Object.keys(SIM_CATEGORIES) as (keyof typeof SIM_CATEGORIES)[]).map(
            (c) => {
              const row = byCat.get(c);
              if (!row) return null;
              const m = SIM_CATEGORIES[c];
              const p = Math.round((row.right / row.total) * 100);
              return (
                <div
                  key={c}
                  className="rounded-lg border border-border bg-surface-2 px-4 py-2.5"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-fg">{m.label}</span>
                    <span className="tabular-nums text-muted">
                      {row.right} / {row.total}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p}%`, background: m.color }}
                    />
                  </div>
                </div>
              );
            },
          )}
        </div>

        {missed.length > 0 ? (
          <div className="mx-auto mt-8 max-w-xl text-left">
            <p className="section-no mb-3">
              Callers you lost ({missed.length})
            </p>
            <div className="space-y-2.5">
              {missed.map((a, i) => {
                const q = SIM_QUESTIONS[a.qIndex];
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-border border-l-4 border-l-danger bg-surface-2 p-3.5 text-sm"
                  >
                    {a.timedOut ? (
                      <p className="mb-1 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-danger">
                        Timed out
                      </p>
                    ) : null}
                    <p className="font-medium text-fg">
                      {q.who}: “{q.q}”
                    </p>
                    <p className="mt-1.5 text-resolved">✓ {q.opts[q.a]}</p>
                    <p className="mt-1 text-muted">{q.x}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => startQuiz(SIM_QUESTIONS.map((_, i) => i))}>
            Take another shift
          </Button>
          {missed.length > 0 ? (
            <Button
              variant="secondary"
              onClick={() => startQuiz(missed.map((a) => a.qIndex))}
            >
              Drill only what I missed
            </Button>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
