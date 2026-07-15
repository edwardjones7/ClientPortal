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
 * PORTAL_API_SECRET). The rep is identified by their login email; rows show
 * up once that email matches a Sales Rep entry in the lead engine
 * (Admin > Sales Reps) with prospects assigned. Until then the rep sees a
 * blank sheet, not an error.
 */

export interface SheetRow {
  id: string;
  leadId: string | null;
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
    // Rep isn't registered in the lead engine yet — every rep still gets a
    // blank sheet; rows appear once prospects are assigned to them.
    return {
      ok: true,
      data: { rep: { id: "", name: "", email: repEmail }, prospects: [] },
    };
  }
  if (!res.ok) {
    return { ok: false, error: `Lead engine returned ${res.status}.` };
  }

  return { ok: true, data: (await res.json()) as RepSheet };
}

export interface RepLeadSummary {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  companyName: string;
  companyDomain: string | null;
  industry: string | null;
  companyLocation: string | null;
  email: string | null;
  phone: string | null;
  icpScore: number | null;
  timingScore: string | null;
  status: string;
  enrichedAt: string | null;
}

export interface PainSignal {
  signal?: string;
  strength?: string;
  source?: string;
}

export interface TriggerEvent {
  type?: string;
  title?: string;
  date?: string;
}

export interface RepLeadDetail extends RepLeadSummary {
  seniority: string | null;
  emailVerified: boolean;
  linkedinUrl: string | null;
  companySize: string | null;
  companyDescription: string | null;
  icpScoreReasoning: string | null;
  tier: string | null;
  companyBrief: string | null;
  contactBrief: string | null;
  competitiveIntel: string | null;
  recommendedAngle: string | null;
  notes: string | null;
  painSignals: Array<PainSignal | string>;
  techStack: string[];
  triggerEvents: TriggerEvent[];
  recentNews: Array<{ title?: string; url?: string; date?: string }>;
  socialActivity: Array<
    | { platform?: string; title?: string; snippet?: string; date?: string }
    | string
  >;
}

export interface TeamAssignment extends SheetRow {
  hiddenFromRep: boolean;
  rep: { id: string; name: string; email: string } | null;
}

/** Admin overview: every rep-assigned sheet row, with rep + visibility. */
export async function fetchTeamAssignments(): Promise<
  SheetResult<TeamAssignment[]>
> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, error: "The outreach connection is not configured." };
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/api/portal/admin/prospects`, {
      headers: { Authorization: `Bearer ${cfg.secret}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach the lead engine." };
  }

  if (!res.ok) {
    return { ok: false, error: `Lead engine returned ${res.status}.` };
  }

  const body = (await res.json()) as { prospects: TeamAssignment[] };
  return { ok: true, data: body.prospects };
}

/** Admin: hide (revoke) or restore a row in the rep's portal view. */
export async function setAssignmentHidden(
  rowId: string,
  hidden: boolean,
): Promise<SheetResult<{ id: string }>> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, error: "The outreach connection is not configured." };
  }

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/api/portal/admin/prospects/${rowId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${cfg.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hidden }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach the lead engine." };
  }

  if (!res.ok) {
    return { ok: false, error: `Save failed (${res.status}).` };
  }

  return { ok: true, data: (await res.json()) as { id: string } };
}

/** Read-only: the leads behind the rep's sheet rows (the portal Leads tab). */
export async function fetchRepLeads(
  repEmail: string,
): Promise<SheetResult<RepLeadSummary[]>> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, error: "The outreach connection is not configured." };
  }

  let res: Response;
  try {
    res = await fetch(
      `${cfg.baseUrl}/api/portal/leads?email=${encodeURIComponent(repEmail)}`,
      {
        headers: { Authorization: `Bearer ${cfg.secret}` },
        cache: "no-store",
      },
    );
  } catch {
    return { ok: false, error: "Could not reach the lead engine." };
  }

  if (res.status === 404) {
    return { ok: false, error: "No leads are set up for this account yet." };
  }
  if (!res.ok) {
    return { ok: false, error: `Lead engine returned ${res.status}.` };
  }

  const body = (await res.json()) as { leads: RepLeadSummary[] };
  return { ok: true, data: body.leads };
}

/** Read-only full brief for one of the rep's leads. */
export async function fetchRepLead(
  leadId: string,
  repEmail: string,
): Promise<SheetResult<RepLeadDetail>> {
  const cfg = config();
  if (!cfg) {
    return { ok: false, error: "The outreach connection is not configured." };
  }

  let res: Response;
  try {
    res = await fetch(
      `${cfg.baseUrl}/api/portal/leads/${leadId}?email=${encodeURIComponent(repEmail)}`,
      {
        headers: { Authorization: `Bearer ${cfg.secret}` },
        cache: "no-store",
      },
    );
  } catch {
    return { ok: false, error: "Could not reach the lead engine." };
  }

  if (!res.ok) {
    return { ok: false, error: `Lead engine returned ${res.status}.` };
  }

  const body = (await res.json()) as { lead: RepLeadDetail };
  return { ok: true, data: body.lead };
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
