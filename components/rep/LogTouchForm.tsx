"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { logTouch, type TouchFormState } from "@/app/(client)/outreach/actions";
import { Button } from "@/components/ui/Button";
import { FormRow, Input, Select, Textarea } from "@/components/ui/Field";

const STATUSES = ["New", "Booked", "Dead"];
const CHANNELS = [
  "Call", "Text", "Text/Call", "DM", "WhatsApp", "Call/Email",
];
const OUTCOMES = [
  "No answer", "Voicemail left", "Gatekeeper", "Spoke to owner",
  "Sent text, awaiting reply", "Not interested", "Booked call", "Dead",
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save touch →"}
    </Button>
  );
}

export function LogTouchForm({
  rowId,
  status,
  channel,
  touchCount,
  hadFirstTouch,
  existingNotes,
}: {
  rowId: string;
  status: string;
  channel: string | null;
  touchCount: number;
  hadFirstTouch: boolean;
  existingNotes: string;
}) {
  const [state, action] = useActionState<TouchFormState, FormData>(
    logTouch,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="rowId" value={rowId} />
      <input type="hidden" name="currentTouches" value={touchCount} />
      <input type="hidden" name="hadFirstTouch" value={hadFirstTouch ? "1" : "0"} />
      <input type="hidden" name="existingNotes" value={existingNotes} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormRow label="Channel" htmlFor="channel">
          <Select id="channel" name="channel" defaultValue={channel ?? ""}>
            <option value="">—</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Outcome" htmlFor="outcome">
          <Select id="outcome" name="outcome" defaultValue="">
            <option value="">—</option>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={status}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Objection" htmlFor="objection">
          <Input
            id="objection"
            name="objection"
            maxLength={200}
            placeholder="I had a guy try that before"
          />
        </FormRow>
        <FormRow label="Next step" htmlFor="nextStep">
          <Input
            id="nextStep"
            name="nextStep"
            maxLength={200}
            placeholder="Call back Thursday morning"
          />
        </FormRow>
        <FormRow label="Next step date" htmlFor="nextStepDate">
          <Input
            id="nextStepDate"
            name="nextStepDate"
            type="date"
            className="[color-scheme:dark]"
          />
        </FormRow>
      </div>

      <FormRow label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          maxLength={2000}
          placeholder="What happened on this touch"
        />
      </FormRow>

      {state.error ? (
        <p className="text-xs text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-xs text-resolved">
          Touch logged. The sheet is updated.
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
