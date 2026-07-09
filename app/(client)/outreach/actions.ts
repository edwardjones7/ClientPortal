"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  updateSheetRow,
  SHEET_STATUSES,
  SHEET_CHANNELS,
  SHEET_OUTCOMES,
  type ActivityUpdate,
} from "@/lib/lead-engine";

export interface TouchFormState {
  ok?: boolean;
  error?: string;
}

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Rep logs a touch on one of their sheet rows. The lead engine enforces row
 * ownership and the activity-only column set — this action shapes the form
 * input and bumps the touch counters.
 */
export async function logTouch(
  _prev: TouchFormState,
  formData: FormData,
): Promise<TouchFormState> {
  const user = await getSessionUser();
  if (!user || user.profile.role !== "employee") {
    return { error: "Sign in as a team member to log activity." };
  }

  const rowId = str(formData, "rowId");
  if (!rowId) return { error: "Missing prospect." };

  const channel = str(formData, "channel");
  const outcome = str(formData, "outcome");
  const status = str(formData, "status");
  const objection = str(formData, "objection").slice(0, 200);
  const nextStep = str(formData, "nextStep").slice(0, 200);
  const nextStepDate = str(formData, "nextStepDate");
  const notes = str(formData, "notes").slice(0, 2000);
  const currentTouches = Number.parseInt(str(formData, "currentTouches"), 10);
  const hadFirstTouch = str(formData, "hadFirstTouch") === "1";
  const existingNotes = str(formData, "existingNotes");

  const today = new Date().toISOString().slice(0, 10);
  const updates: ActivityUpdate = {
    touchCount: (Number.isFinite(currentTouches) ? currentTouches : 0) + 1,
    lastTouch: today,
  };
  if (!hadFirstTouch) updates.firstTouch = today;
  if ((SHEET_CHANNELS as readonly string[]).includes(channel)) {
    updates.channel = channel;
  }
  if ((SHEET_OUTCOMES as readonly string[]).includes(outcome)) {
    updates.outcome = outcome;
  }
  if ((SHEET_STATUSES as readonly string[]).includes(status)) {
    updates.status = status;
  }
  if (objection) updates.objection = objection;
  if (nextStep) updates.nextStep = nextStep;
  if (/^\d{4}-\d{2}-\d{2}$/.test(nextStepDate)) {
    updates.nextStepDate = nextStepDate;
  }
  if (notes) {
    const stamped = `${today} — ${notes}`;
    updates.activityNotes = existingNotes
      ? `${existingNotes}\n${stamped}`.slice(0, 5000)
      : stamped;
  }

  const result = await updateSheetRow(rowId, user.email, updates);
  if (!result.ok) return { error: result.error };

  revalidatePath("/outreach");
  revalidatePath(`/outreach/${rowId}`);
  return { ok: true };
}

/* ---- Inline sheet editing ---- */

const EDITABLE_KEYS = [
  "status",
  "touchCount",
  "firstTouch",
  "lastTouch",
  "channel",
  "outcome",
  "objection",
  "stage",
  "nextStep",
  "nextStepDate",
  "activityNotes",
] as const;

export type EditableKey = (typeof EDITABLE_KEYS)[number];

export interface CellSaveResult {
  ok: boolean;
  error?: string;
}

/**
 * Save a single cell from the rep's spreadsheet view. The lead engine
 * enforces row ownership and the activity-only column set — this action
 * shapes one key/value into an update.
 */
export async function saveSheetCell(
  rowId: string,
  key: EditableKey,
  value: string | number | null,
): Promise<CellSaveResult> {
  const user = await getSessionUser();
  if (!user || user.profile.role !== "employee") {
    return { ok: false, error: "Only reps can edit their sheet." };
  }
  if (!rowId || !(EDITABLE_KEYS as readonly string[]).includes(key)) {
    return { ok: false, error: "That column can't be edited." };
  }

  const updates: ActivityUpdate = {};
  if (key === "touchCount") {
    const n =
      typeof value === "number" ? value : Number.parseInt(String(value), 10);
    updates.touchCount = Number.isFinite(n) ? Math.max(0, n) : null;
  } else if (key === "status") {
    const s = String(value ?? "").trim();
    if (!(SHEET_STATUSES as readonly string[]).includes(s)) {
      return { ok: false, error: "Pick a valid status." };
    }
    updates.status = s;
  } else {
    const s = typeof value === "string" ? value.trim() : value;
    updates[key] = (s === "" ? null : s) as never;
  }

  const result = await updateSheetRow(rowId, user.email, updates);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/outreach");
  return { ok: true };
}
