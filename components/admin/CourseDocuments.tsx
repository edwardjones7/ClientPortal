"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadFiles } from "@/lib/attachments";
import {
  recordCourseResource,
  deleteCourseResource,
} from "@/app/(admin)/admin/courses/actions";
import { cx } from "@/lib/utils";

export interface CourseDoc {
  id: string;
  file_name: string;
  title: string | null;
  size_bytes: number | null;
}

function fileSize(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Admin: upload + manage downloadable documents attached to a course. */
export function CourseDocuments({
  courseId,
  resources,
}: {
  courseId: string;
  resources: CourseDoc[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();

  function onPick(list: FileList | null) {
    const picked = Array.from(list ?? []).filter((f) => f.size > 0);
    if (inputRef.current) inputRef.current.value = "";
    if (picked.length === 0) return;
    setError(null);
    start(async () => {
      const supabase = createClient();
      const { uploaded, failed } = await uploadFiles(supabase, {
        bucket: "course-files",
        prefix: courseId,
        files: picked,
      });
      for (const f of uploaded) {
        const res = await recordCourseResource({
          courseId,
          title: null,
          storagePath: f.storage_path,
          fileName: f.file_name,
          mimeType: f.mime_type,
          sizeBytes: f.size_bytes,
        });
        if (res.error) failed.push(f.file_name);
      }
      if (failed.length > 0) {
        setError(`${failed.length} file${failed.length > 1 ? "s" : ""} didn't upload.`);
      }
      router.refresh();
    });
  }

  function onDelete(id: string) {
    start(async () => {
      await deleteCourseResource({ id, courseId });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {resources.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {resources.map((r) => {
            const size = fileSize(r.size_bytes);
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-fg">
                  {r.title || r.file_name}
                </span>
                {size ? (
                  <span className="shrink-0 text-xs text-muted">{size}</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  disabled={pending}
                  className="shrink-0 text-xs text-muted hover:text-danger disabled:pointer-events-none"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">No files yet.</p>
      )}

      {/* No `accept` filter — any file type is allowed (docs, slides, zips…). */}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragging) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onPick(e.dataTransfer.files);
        }}
        className={cx(
          "cursor-pointer rounded-md border border-dashed px-4 py-6 text-center transition-colors focus:outline-none focus:border-accent",
          dragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-border-strong",
          pending && "pointer-events-none opacity-60",
        )}
      >
        <p className="text-sm text-muted">
          {pending
            ? "Uploading…"
            : dragging
              ? "Drop to upload"
              : "Drag & drop files here, or click to browse"}
        </p>
        <p className="meta mt-1">
          Any file type · documents, slideshows, images, more
        </p>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
