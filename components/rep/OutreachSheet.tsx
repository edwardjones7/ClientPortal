"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { saveSheetCell, type EditableKey } from "@/app/(client)/outreach/actions";
import type { SheetRow } from "@/lib/lead-engine";
import { cx } from "@/lib/utils";

/**
 * The rep's outreach sheet as an inline-editable spreadsheet — mirrors the
 * grid in the lead engine. Activity columns are editable; the columns Elenos
 * owns (business, contact, priority, prospect notes) are read-only here.
 * Click a cell to edit · Enter commits & moves down · Tab moves right ·
 * Esc cancels.
 */

const STATUSES = ["New", "Booked", "Dead"];
const CHANNELS = [
  "Call", "Text", "Text/Call", "DM", "WhatsApp", "Call/Email",
];
const OUTCOMES = [
  "No answer", "Voicemail left", "Gatekeeper", "Spoke to owner",
  "Sent text, awaiting reply", "Not interested", "Booked call", "Dead",
];

type ColumnType = "text" | "select" | "date" | "number" | "longtext";

interface ColumnDef {
  key: keyof SheetRow;
  label: string;
  type: ColumnType;
  width: string;
  editable: boolean;
  options?: readonly string[];
}

const COLUMNS: ColumnDef[] = [
  { key: "status", label: "Status", type: "select", width: "w-28", editable: true, options: STATUSES },
  { key: "businessName", label: "Business Name", type: "text", width: "min-w-[190px]", editable: false },
  { key: "ownerContact", label: "Owner/Contact", type: "text", width: "min-w-[130px]", editable: false },
  { key: "phone", label: "Phone", type: "text", width: "min-w-[130px]", editable: false },
  { key: "email", label: "Email", type: "text", width: "min-w-[180px]", editable: false },
  { key: "websiteUrl", label: "Website", type: "text", width: "min-w-[150px]", editable: false },
  { key: "city", label: "City", type: "text", width: "min-w-[100px]", editable: false },
  { key: "state", label: "State", type: "text", width: "w-16", editable: false },
  { key: "vertical", label: "Vertical", type: "text", width: "min-w-[110px]", editable: false },
  { key: "painSignal", label: "Pain Signal", type: "text", width: "min-w-[170px]", editable: false },
  { key: "signalSource", label: "Signal Source", type: "text", width: "min-w-[130px]", editable: false },
  { key: "priority", label: "Priority", type: "text", width: "w-20", editable: false },
  { key: "prospectNotes", label: "Prospect Notes", type: "longtext", width: "min-w-[220px]", editable: false },
  { key: "touchCount", label: "Touch #", type: "number", width: "w-20", editable: true },
  { key: "firstTouch", label: "First Touch", type: "date", width: "w-36", editable: true },
  { key: "lastTouch", label: "Last Touch", type: "date", width: "w-36", editable: true },
  { key: "channel", label: "Channel", type: "select", width: "w-32", editable: true, options: CHANNELS },
  { key: "outcome", label: "Outcome", type: "select", width: "min-w-[170px]", editable: true, options: OUTCOMES },
  { key: "objection", label: "Objection", type: "text", width: "min-w-[130px]", editable: true },
  { key: "stage", label: "Stage", type: "text", width: "min-w-[110px]", editable: true },
  { key: "nextStep", label: "Next Step", type: "text", width: "min-w-[140px]", editable: true },
  { key: "nextStepDate", label: "Next Step Date", type: "date", width: "w-36", editable: true },
  { key: "activityNotes", label: "Activity Notes", type: "longtext", width: "min-w-[240px]", editable: true },
];

const SEARCH_KEYS: (keyof SheetRow)[] = [
  "businessName", "ownerContact", "phone", "email", "city", "state",
  "vertical", "prospectNotes", "activityNotes", "outcome", "nextStep",
];

const STATUS_TONE: Record<string, string> = {
  New: "text-open",
  Booked: "text-resolved",
  Dead: "text-faint",
};

const PRIORITY_TONE: Record<string, string> = {
  A: "text-resolved",
  B: "text-waiting",
  C: "text-faint",
};

function displayValue(row: SheetRow, col: ColumnDef): string {
  const v = row[col.key];
  if (v === null || v === undefined) return "";
  return String(v);
}

export function OutreachSheet({
  rows: initialRows,
  readOnly = false,
}: {
  rows: SheetRow[];
  readOnly?: boolean;
}) {
  const [rows, setRows] = useState<SheetRow[]>(initialRows);
  const [editing, setEditing] = useState<{ rowId: string; colKey: keyof SheetRow } | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const skipBlurRef = useRef(false);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      SEARCH_KEYS.some((key) => {
        const v = row[key];
        return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
      }),
    );
  }, [rows, search]);

  const editableColumns = COLUMNS.filter((c) => c.editable);

  function startEditing(row: SheetRow, col: ColumnDef) {
    if (readOnly || !col.editable) return;
    skipBlurRef.current = false;
    setEditing({ rowId: row.id, colKey: col.key });
    setDraft(displayValue(row, col));
  }

  function cancelEditing() {
    skipBlurRef.current = true;
    setEditing(null);
  }

  function normalize(col: ColumnDef, raw: string): string | number | null {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    if (col.type === "number") {
      const n = Number.parseInt(trimmed, 10);
      return Number.isFinite(n) ? n : null;
    }
    return trimmed;
  }

  async function commit(rowId: string, col: ColumnDef, raw: string) {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const next = normalize(col, raw);
    const current = row[col.key] ?? null;
    if (next === current) return;

    const previous = row[col.key];
    setRows((rs) =>
      rs.map((r) => (r.id === rowId ? { ...r, [col.key]: next } : r)),
    );
    setError(null);

    const result = await saveSheetCell(rowId, col.key as EditableKey, next);
    if (!result.ok) {
      setRows((rs) =>
        rs.map((r) => (r.id === rowId ? { ...r, [col.key]: previous } : r)),
      );
      setError(result.error ?? `Couldn't save ${col.label}.`);
    }
  }

  /** Commit the active cell, then move the editor across EDITABLE cells. */
  function commitAndMove(rowId: string, col: ColumnDef, raw: string, dRow: number, dCol: number) {
    skipBlurRef.current = true;
    void commit(rowId, col, raw);

    const rowIdx = filteredRows.findIndex((r) => r.id === rowId);
    const colIdx = editableColumns.findIndex((c) => c.key === col.key);
    const nextRowIdx = rowIdx + dRow;
    const nextColIdx = colIdx + dCol;

    if (
      rowIdx === -1 ||
      nextRowIdx < 0 || nextRowIdx >= filteredRows.length ||
      nextColIdx < 0 || nextColIdx >= editableColumns.length
    ) {
      setEditing(null);
      return;
    }
    const nextRow = filteredRows[nextRowIdx];
    const nextCol = editableColumns[nextColIdx];
    setEditing({ rowId: nextRow.id, colKey: nextCol.key });
    setDraft(displayValue(nextRow, nextCol));
    skipBlurRef.current = false;
  }

  function handleKeyDown(e: React.KeyboardEvent, rowId: string, col: ColumnDef) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      commitAndMove(rowId, col, draft, 0, e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === "Enter") {
      if (col.type === "longtext" && e.shiftKey) return; // newline
      e.preventDefault();
      commitAndMove(rowId, col, draft, 1, 0);
    }
  }

  function handleBlur(rowId: string, col: ColumnDef) {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    void commit(rowId, col, draft);
    setEditing(null);
  }

  function renderEditor(row: SheetRow, col: ColumnDef) {
    const common = {
      autoFocus: true,
      onBlur: () => handleBlur(row.id, col),
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, row.id, col),
    };
    const inputClass =
      "h-7 w-full rounded border border-accent bg-surface-2 px-1 text-xs text-fg focus:outline-none";

    if (col.type === "select") {
      const options = [...(col.options ?? [])];
      if (draft && !options.includes(draft)) options.push(draft);
      return (
        <select
          {...common}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            skipBlurRef.current = true;
            void commit(row.id, col, e.target.value);
            setEditing(null);
          }}
          className={inputClass}
        >
          {col.key !== "status" ? <option value="">—</option> : null}
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }

    if (col.type === "longtext") {
      return (
        <textarea
          {...common}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full min-w-[220px] resize-y rounded border border-accent bg-surface-2 p-1 text-xs text-fg focus:outline-none"
        />
      );
    }

    return (
      <input
        {...common}
        type={col.type === "date" ? "date" : col.type === "number" ? "number" : "text"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={cx(inputClass, "[color-scheme:dark]")}
      />
    );
  }

  function renderIdle(row: SheetRow, col: ColumnDef) {
    const value = displayValue(row, col);

    if (col.key === "businessName") {
      const label = value || "Untitled";
      return row.leadId ? (
        <Link
          href={`/leads/${row.leadId}`}
          className="block truncate font-medium text-fg hover:text-accent-fg hover:underline"
          title="Open the full lead brief"
        >
          {label}
        </Link>
      ) : (
        <span className="block truncate font-medium text-fg">{label}</span>
      );
    }
    if (col.key === "status" && value) {
      return (
        <span className={cx("text-xs font-medium", STATUS_TONE[value] ?? "text-muted")}>
          {value}
        </span>
      );
    }
    if (col.key === "priority" && value) {
      return (
        <span className={cx("text-xs font-semibold", PRIORITY_TONE[value] ?? "text-muted")}>
          {value}
        </span>
      );
    }
    if (col.key === "phone" && value) {
      return (
        <a href={`tel:${value}`} className="block truncate text-accent-fg hover:underline">
          {value}
        </a>
      );
    }
    if (col.key === "websiteUrl" && value) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="block max-w-[200px] truncate text-accent-fg hover:underline"
        >
          {value.replace(/^https?:\/\//, "")}
        </a>
      );
    }
    if (!value) return <span className="text-faint">—</span>;

    if (col.type === "longtext" || col.key === "painSignal") {
      return (
        <span className="block max-w-[280px] truncate" title={value}>
          {value}
        </span>
      );
    }
    return <span className="block truncate">{value}</span>;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prospects…"
          className="h-9 w-64 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <span className="text-xs text-faint">
          {filteredRows.length} of {rows.length} prospect{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {/* Grid */}
      <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-lg border border-border">
        <table className="min-w-max border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-2">
              <th className="sticky left-0 z-20 border-b border-r border-border bg-surface-2 px-2 py-2 text-left font-semibold text-faint">#</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cx(
                    "whitespace-nowrap border-b border-r border-border bg-surface-2 px-2 py-2 text-left font-semibold",
                    col.editable && !readOnly ? "text-muted" : "text-faint",
                    col.width,
                  )}
                  title={col.editable ? undefined : "Set by Elenos"}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={row.id} className="group hover:bg-surface-2/50">
                <td className="sticky left-0 z-10 select-none border-b border-r border-border bg-surface px-2 py-1 text-right font-mono text-[10px] text-faint">
                  {idx + 1}
                </td>
                {COLUMNS.map((col) => {
                  const isEditing =
                    editing?.rowId === row.id && editing.colKey === col.key;
                  const canEdit = col.editable && !readOnly;
                  return (
                    <td
                      key={col.key}
                      onClick={() => !isEditing && startEditing(row, col)}
                      className={cx(
                        "border-b border-r border-border px-2 py-1.5 align-top",
                        col.width,
                        canEdit ? "cursor-text text-fg" : "text-muted",
                        isEditing && "bg-surface-2 p-0.5",
                      )}
                    >
                      {isEditing ? renderEditor(row, col) : renderIdle(row, col)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + 1}
                  className="px-4 py-12 text-center text-sm text-faint"
                >
                  {rows.length === 0
                    ? "Nothing on your sheet yet — new prospects land here as they're assigned to you."
                    : "No prospects match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-faint">
        {readOnly
          ? "Preview — the rep edits this sheet."
          : "Click a cell to edit · Enter commits & moves down · Tab moves right · Esc cancels · Business name opens the full lead brief · Dimmed columns are set by Elenos"}
      </p>
    </div>
  );
}
