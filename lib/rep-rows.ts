import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SheetRow } from "@/lib/lead-engine";

/**
 * Rep-owned outreach rows — the "blank outline" every sales rep gets.
 * Unlike lead-engine rows (assigned by Elenos; activity columns only),
 * these live in portal.rep_prospects and the rep owns every column: they
 * fill in businesses they prospect themselves. RLS: owner read/write,
 * admin read-only (for "View as" previews). Merged into the sheet after
 * the lead-engine rows, flagged with `local: true`.
 */

/** Blank rows seeded on a rep's first visit to /outreach. */
export const BLANK_ROW_COUNT = 30;

/** Rows appended per click of the sheet's "Add row" button. */
export const ADD_ROWS_BATCH = 1;

/** Every column the rep may edit on their own rows. */
export const LOCAL_EDITABLE_KEYS = [
  "status", "businessName", "ownerContact", "phone", "email", "websiteUrl",
  "city", "state", "vertical", "painSignal", "signalSource", "priority",
  "prospectNotes", "touchCount", "firstTouch", "lastTouch", "channel",
  "outcome", "objection", "stage", "nextStep", "nextStepDate", "activityNotes",
] as const;

export type LocalEditableKey = (typeof LOCAL_EDITABLE_KEYS)[number];
export type LocalRowUpdate = Partial<Pick<SheetRow, LocalEditableKey>>;

interface DbRow {
  id: string;
  profile_id: string;
  sort_order: number;
  status: string;
  business_name: string | null;
  owner_contact: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  city: string | null;
  state: string | null;
  vertical: string | null;
  pain_signal: string | null;
  signal_source: string | null;
  priority: string | null;
  prospect_notes: string | null;
  touch_count: number | null;
  first_touch: string | null;
  last_touch: string | null;
  channel: string | null;
  outcome: string | null;
  objection: string | null;
  stage: string | null;
  next_step: string | null;
  next_step_date: string | null;
  activity_notes: string | null;
}

const KEY_TO_COLUMN: Record<LocalEditableKey, keyof DbRow> = {
  status: "status",
  businessName: "business_name",
  ownerContact: "owner_contact",
  phone: "phone",
  email: "email",
  websiteUrl: "website_url",
  city: "city",
  state: "state",
  vertical: "vertical",
  painSignal: "pain_signal",
  signalSource: "signal_source",
  priority: "priority",
  prospectNotes: "prospect_notes",
  touchCount: "touch_count",
  firstTouch: "first_touch",
  lastTouch: "last_touch",
  channel: "channel",
  outcome: "outcome",
  objection: "objection",
  stage: "stage",
  nextStep: "next_step",
  nextStepDate: "next_step_date",
  activityNotes: "activity_notes",
};

function toSheetRow(r: DbRow): SheetRow {
  return {
    id: r.id,
    leadId: null,
    sortOrder: r.sort_order,
    status: r.status,
    businessName: r.business_name ?? "",
    ownerContact: r.owner_contact,
    phone: r.phone,
    email: r.email,
    websiteUrl: r.website_url,
    city: r.city,
    state: r.state,
    vertical: r.vertical,
    painSignal: r.pain_signal,
    signalSource: r.signal_source,
    priority: r.priority,
    prospectNotes: r.prospect_notes,
    touchCount: r.touch_count,
    firstTouch: r.first_touch,
    lastTouch: r.last_touch,
    channel: r.channel,
    outcome: r.outcome,
    objection: r.objection,
    stage: r.stage,
    nextStep: r.next_step,
    nextStepDate: r.next_step_date,
    activityNotes: r.activity_notes,
    local: true,
  };
}

/** The rep's own rows, in sheet order. RLS scopes access. */
export async function fetchLocalRows(profileId: string): Promise<SheetRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rep_prospects")
    .select("*")
    .eq("profile_id", profileId)
    .order("sort_order")
    .order("created_at");
  return ((data ?? []) as DbRow[]).map(toSheetRow);
}

/**
 * First-visit seeding: if the rep has no rows yet, give them the blank
 * outline. Upsert + the unique (profile_id, sort_order) index makes
 * concurrent seeds collapse into one.
 */
export async function ensureLocalRows(profileId: string): Promise<SheetRow[]> {
  const existing = await fetchLocalRows(profileId);
  if (existing.length > 0) return existing;

  const supabase = await createClient();
  const blanks = Array.from({ length: BLANK_ROW_COUNT }, (_, i) => ({
    profile_id: profileId,
    sort_order: i + 1,
  }));
  await supabase.from("rep_prospects").upsert(blanks, {
    onConflict: "profile_id,sort_order",
    ignoreDuplicates: true,
  });
  return fetchLocalRows(profileId);
}

/** Append blank rows below the rep's existing ones. Returns the new rows. */
export async function addLocalRows(
  profileId: string,
  count: number,
): Promise<SheetRow[]> {
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("rep_prospects")
    .select("sort_order")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const start = (last?.sort_order ?? 0) + 1;
  const blanks = Array.from({ length: count }, (_, i) => ({
    profile_id: profileId,
    sort_order: start + i,
  }));
  const { data, error } = await supabase
    .from("rep_prospects")
    .insert(blanks)
    .select("*");
  if (error || !data) return [];
  return (data as DbRow[]).map(toSheetRow);
}

/**
 * Save edits to one of the rep's own rows. RLS enforces ownership — an
 * update that matches no row (someone else's id) reports back as an error.
 */
export async function updateLocalRow(
  rowId: string,
  updates: LocalRowUpdate,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const payload: Partial<Record<keyof DbRow, unknown>> = {};
  for (const [key, value] of Object.entries(updates)) {
    const column = KEY_TO_COLUMN[key as LocalEditableKey];
    if (column) payload[column] = value;
  }
  if (Object.keys(payload).length === 0) return { ok: true };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rep_prospects")
    .update(payload)
    .eq("id", rowId)
    .select("id");
  if (error) return { ok: false, error: "Couldn't save that change." };
  if (!data || data.length === 0) {
    return { ok: false, error: "That row isn't yours to edit." };
  }
  return { ok: true };
}

/**
 * Admin "View as" preview: resolve the rep's rows by their login email
 * (the same key the lead engine resolves sheets by).
 */
export async function fetchLocalRowsByEmail(email: string): Promise<SheetRow[]> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle<{ id: string }>();
  if (!profile) return [];
  return fetchLocalRows(profile.id);
}

/**
 * Admin: append blank rows to a rep's sheet by their login email. Uses the
 * service-role client because RLS lets a rep insert only their own rows —
 * this is the admin provisioning rows for someone else from the "View as"
 * preview. Returns the new rows (empty on unknown email / failure).
 */
export async function addLocalRowsForEmail(
  email: string,
  count: number,
): Promise<SheetRow[]> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle<{ id: string }>();
  if (!profile) return [];

  const { data: last } = await admin
    .from("rep_prospects")
    .select("sort_order")
    .eq("profile_id", profile.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  const start = (last?.sort_order ?? 0) + 1;
  const blanks = Array.from({ length: count }, (_, i) => ({
    profile_id: profile.id,
    sort_order: start + i,
  }));
  const { data, error } = await admin
    .from("rep_prospects")
    .insert(blanks)
    .select("*");
  if (error || !data) return [];
  return (data as DbRow[]).map(toSheetRow);
}
