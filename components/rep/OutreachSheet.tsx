"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  addSheetRows,
  saveSheetCell,
  type SheetCellKey,
} from "@/app/(client)/outreach/actions";
import type { SheetRow } from "@/lib/lead-engine";
import { cx } from "@/lib/utils";

/**
 * The rep's outreach sheet as an inline-editable spreadsheet — mirrors the
 * grid in the lead engine. On assigned (lead-engine) rows only the activity
 * columns are editable — the columns Elenos owns (business, contact,
 * priority, prospect notes) are read-only. On the rep's own rows (`local`,
 * the blank outline below the assignments) every column is theirs to fill.
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
  /** Cap on the rendered cell content — long values truncate (full value on hover). */
  max?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "status", label: "Status", type: "select", width: "w-28", editable: true, options: STATUSES },
  { key: "businessName", label: "Business Name", type: "text", width: "min-w-[170px]", editable: false, max: "max-w-[210px]" },
  { key: "ownerContact", label: "Owner/Contact", type: "text", width: "min-w-[120px]", editable: false, max: "max-w-[150px]" },
  { key: "phone", label: "Phone", type: "text", width: "min-w-[120px]", editable: false },
  { key: "email", label: "Email", type: "text", width: "min-w-[150px]", editable: false, max: "max-w-[190px]" },
  { key: "websiteUrl", label: "Website", type: "text", width: "min-w-[130px]", editable: false, max: "max-w-[170px]" },
  { key: "city", label: "City", type: "text", width: "min-w-[90px]", editable: false, max: "max-w-[120px]" },
  { key: "state", label: "State", type: "text", width: "w-14", editable: false },
  { key: "vertical", label: "Vertical", type: "text", width: "min-w-[100px]", editable: false, max: "max-w-[130px]" },
  { key: "painSignal", label: "Pain Signal", type: "text", width: "min-w-[150px]", editable: false, max: "max-w-[210px]" },
  { key: "signalSource", label: "Signal Source", type: "text", width: "min-w-[110px]", editable: false, max: "max-w-[140px]" },
  { key: "priority", label: "Priority", type: "text", width: "w-16", editable: false },
  { key: "prospectNotes", label: "Prospect Notes", type: "longtext", width: "min-w-[200px]", editable: false, max: "max-w-[250px]" },
  { key: "touchCount", label: "Touch #", type: "number", width: "w-16", editable: true },
  { key: "firstTouch", label: "First Touch", type: "date", width: "w-32", editable: true },
  { key: "lastTouch", label: "Last Touch", type: "date", width: "w-32", editable: true },
  { key: "channel", label: "Channel", type: "select", width: "w-28", editable: true, options: CHANNELS },
  { key: "outcome", label: "Outcome", type: "select", width: "min-w-[160px]", editable: true, options: OUTCOMES },
  { key: "objection", label: "Objection", type: "text", width: "min-w-[120px]", editable: true, max: "max-w-[160px]" },
  { key: "stage", label: "Stage", type: "text", width: "min-w-[100px]", editable: true, max: "max-w-[130px]" },
  { key: "nextStep", label: "Next Step", type: "text", width: "min-w-[130px]", editable: true, max: "max-w-[170px]" },
  { key: "nextStepDate", label: "Next Step Date", type: "date", width: "w-32", editable: true },
  { key: "activityNotes", label: "Activity Notes", type: "longtext", width: "min-w-[220px]", editable: true, max: "max-w-[280px]" },
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
  canAddRows = false,
}: {
  rows: SheetRow[];
  readOnly?: boolean;
  canAddRows?: boolean;
}) {
  const [rows, setRows] = useState<SheetRow[]>(initialRows);
  const [editing, setEditing] = useState<{ rowId: string; colKey: keyof SheetRow } | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addingRows, setAddingRows] = useState(false);
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

  /** Local (rep-owned) rows are editable in every column. */
  function editableCols(row: SheetRow): ColumnDef[] {
    return row.local ? COLUMNS : COLUMNS.filter((c) => c.editable);
  }

  function startEditing(row: SheetRow, col: ColumnDef) {
    if (readOnly || (!col.editable && !row.local)) return;
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

    const result = await saveSheetCell(
      rowId,
      col.key as SheetCellKey,
      next,
      !!row.local,
    );
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
    if (rowIdx === -1) {
      setEditing(null);
      return;
    }

    let nextRow = filteredRows[rowIdx];
    let nextCol = col;

    if (dRow !== 0) {
      // Enter: same column, next row — stop if it isn't editable there.
      const nextRowIdx = rowIdx + dRow;
      if (nextRowIdx < 0 || nextRowIdx >= filteredRows.length) {
        setEditing(null);
        return;
      }
      nextRow = filteredRows[nextRowIdx];
      if (!col.editable && !nextRow.local) {
        setEditing(null);
        return;
      }
    } else {
      // Tab: next editable column within this row's set.
      const cols = editableCols(nextRow);
      const colIdx = cols.findIndex((c) => c.key === col.key);
      const nextColIdx = colIdx + dCol;
      if (colIdx === -1 || nextColIdx < 0 || nextColIdx >= cols.length) {
        setEditing(null);
        return;
      }
      nextCol = cols[nextColIdx];
    }

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
      if (row.local && !value) return <span className="text-faint">—</span>;
      const label = value || "Untitled";
      return row.leadId ? (
        <Link
          href={`/leads/${row.leadId}`}
          className={cx("block truncate font-medium text-fg hover:text-accent-fg hover:underline", col.max)}
          title="Open the full lead brief"
        >
          {label}
        </Link>
      ) : (
        <span className={cx("block truncate font-medium text-fg", col.max)}>{label}</span>
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
          className={cx("block truncate text-accent-fg hover:underline", col.max ?? "max-w-[200px]")}
          title={value}
        >
          {value.replace(/^https?:\/\//, "")}
        </a>
      );
    }
    if (!value) return <span className="text-faint">—</span>;

    if (col.type === "longtext" || col.key === "painSignal") {
      return (
        <span className={cx("block truncate", col.max ?? "max-w-[280px]")} title={value}>
          {value}
        </span>
      );
    }
    return (
      <span className={cx("block truncate", col.max)} title={col.max ? value : undefined}>
        {value}
      </span>
    );
  }

  async function handleAddRows() {
    setAddingRows(true);
    setError(null);
    const result = await addSheetRows();
    if (result.ok && result.rows) {
      const added = result.rows;
      setRows((rs) => [...rs, ...added]);
    } else {
      setError(result.error ?? "Couldn't add rows.");
    }
    setAddingRows(false);
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
        <div className="flex items-center gap-3">
          <span className="text-xs text-faint">
            {filteredRows.length} of {rows.length} row{rows.length !== 1 ? "s" : ""}
          </span>
          {canAddRows ? (
            <button
              type="button"
              onClick={handleAddRows}
              disabled={addingRows}
              className="h-9 rounded-md border border-border bg-surface-2 px-3 text-xs font-medium text-fg hover:border-accent disabled:opacity-50"
            >
              {addingRows ? "Adding…" : "+ Add row"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {/* Grid — min-w-0 keeps the scroll box bounded to the content column
          so the wide table scrolls inside it; max-h-[70vh] keeps the
          horizontal scrollbar on-screen (the preview banner can otherwise
          push a 100vh box's bottom past the fold). The shell is full-width,
          so this box already runs to the viewport edge. */}
      <div className="min-w-0 max-h-[70vh] overflow-x-auto overflow-y-auto rounded-lg border border-border">
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
                  title={
                    col.editable
                      ? undefined
                      : "Set by Elenos on assigned prospects — editable on your own rows"
                  }
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
                  const canEdit = (col.editable || !!row.local) && !readOnly;
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
          : "Click a cell to edit · Enter commits & moves down · Tab moves right · Esc cancels · Business name opens the full lead brief · On assigned prospects the dimmed columns are set by Elenos — blank rows are all yours to fill"}
      </p>
    </div>
  );
}
