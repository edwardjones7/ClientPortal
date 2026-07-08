import "server-only";

/**
 * Lead engine bridge. A rep's outreach sheet lives in the Elenos lead
 * engine (the backend at admin.elenos.ai), not in the portal database.
 * The portal reads and writes it server-to-server:
 *
 *   GET   {LEAD_ENGINE_URL}/api/portal/prospects?email=<rep email>
 *   PATCH {LEAD_ENGINE_URL}/api/portal/prospects/<id>
 *
 * Auth: Bearer LEAD_ENGINE_PORTAL_SECRET (the lead engine's
 * PORTAL_API_SECRET). The rep is identified by their login email, which
 * must match a Sales Rep entry in the lead engine (Admin > Sales Reps).
 */

export interface SheetRow {
  id: string;
  sortOrder: number;
  status: string;
  businessName: string;
  ownerContact: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  city: string | null;
  state: string | null;
  vertical: string | null;
  painSignal: string | null;
  signalSource: string | null;
  priority: string | null;
  prospectNotes: string | null;
  touchCount: number | null;
  firstTouch: string | null;
  lastTouch: string | null;
  channel: string | null;
  outcome: string | null;
  objection: string | null;
  stage: string | null;
  nextStep: string | null;
  nextStepDate: string | null;
  activityNotes: string | null;
}

export interface RepSheet {
  rep: { id: string; name: string; email: string };
  prospects: SheetRow[];
}

export type ActivityUpdate = Partial<
  Pick<
    SheetRow,
    | "status"
    | "touchCount"
    | "firstTouch"
    | "lastTouch"
    | "channel"
    | "outcome"
    | "objection"
    | "stage"
    | "nextStep"
    | "nextStepDate"
    | "activityNotes"
  >
>;

export type SheetResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/* Option lists mirror the lead engine's prospect constants — keep in sync. */
export const SHEET_STATUSES = ["New", "Booked", "Dead"] as const;
export const SHEET_CHANNELS = [
  "Call", "Text", "Text/Call", "DM", "WhatsApp", "Call/Email",
] as const;
export const SHEET_OUTCOMES = [
  "No answer", "Voicemail left", "Gatekeeper", "Spoke to owner",
  "Sent text, awaiting reply", "Not interested", "Booked call", "Dead",
] as const;

function config(): { baseUrl: string; secret: string } | null {
  const baseUrl = process.env.LEAD_ENGINE_URL?.replace(/\/$/, "");
  const secret = process.env.LEAD_ENGINE_PORTAL_SECRET;
  if (!baseUrl || !secret) return null;
  return { baseUrl, secret };
}

export async function fetchRepSheet(
  repEmail: string,
): Promise<SheetResult<RepSheet>> {
  const cfg = config();
  if (!cfg) {
    return {
      ok: false,
      error:
        "The outreach connection is not configured yet (LEAD_ENGINE_URL / LEAD_ENGINE_PORTAL_SECRET).",
    };
  }

  let res: Response;
  try {
    res = await fetch(
      `${cfg.baseUrl}/api/portal/prospects?email=${encodeURIComponent(repEmail)}`,
      {
        headers: { Authorization: `Bearer ${cfg.secret}` },
        cache: "no-store",
      },
    );
  } catch {
    return { ok: false, error: "Could not reach the lead engine." };
  }

  if (res.status === 404) {
    return {
      ok: false,
      error:
        "No outreach sheet is set up for this account yet. Ask Elenos to add you as a rep.",
    };
  }
  if (!res.ok) {
    return { ok: false, error: `Lead engine returned ${res.status}.` };
  }

  return { ok: true, data: (await res.json()) as RepSheet };
}

export async function updateSheetRow(
  rowId: string,
  repEmail: string,
  updates: ActivityUpdate,
): Promise<SheetResult<SheetRow>> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, error: "The outreach connection is not configured." };
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/api/portal/prospects/${rowId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${cfg.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: repEmail, updates }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach the lead engine." };
  }

  if (!res.ok) {
    return { ok: false, error: `Save failed (${res.status}).` };
  }

  return { ok: true, data: (await res.json()) as SheetRow };
}
