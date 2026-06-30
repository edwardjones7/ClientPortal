"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { CreateOrgForm } from "./CreateOrgForm";
import { InviteEmployeeForm } from "./InviteEmployeeForm";
import { cx } from "@/lib/utils";

type Mode = "client" | "employee";

/** One place to invite either a client business or an internal team member. */
export function InviteHub() {
  const [mode, setMode] = useState<Mode>("client");

  return (
    <div className="max-w-2xl">
      <div className="mb-5 inline-flex rounded-md border border-border bg-surface-2/40 p-1">
        {(
          [
            ["client", "Client"],
            ["employee", "Employee"],
          ] as [Mode, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cx(
              "rounded px-4 py-1.5 text-sm transition-colors",
              mode === value
                ? "bg-surface-2 text-fg shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                : "text-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Panel className="p-6">
        {mode === "client" ? <CreateOrgForm /> : <InviteEmployeeForm />}
      </Panel>

      <p className="meta mt-4">
        {mode === "client"
          ? "Creates the client's organization. No email is sent — copy the link and send it. Valid 12 hours, reusable until they set a password."
          : "Adds an internal team member to Elenos Team. No email is sent — copy the link and send it. They see only the training you assign them."}
      </p>
    </div>
  );
}
