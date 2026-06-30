"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadFiles } from "@/lib/attachments";
import { generateFileThumbnail } from "@/lib/thumbnails";
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
  thumbnail_url: string | null;
}

function fileSize(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Admin: upload + manage course files. Generates a preview thumbnail where it
 *  can (PDF first page; images preview themselves). */
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
      const failedNames: string[] = [];

      for (const file of picked) {
        // 1) Upload the file itself.
        const { uploaded, failed } = await uploadFiles(supabase, {
          bucket: "course-files",
          prefix: courseId,
          files: [file],
        });
        if (failed.length > 0 || uploaded.length === 0) {
          failedNames.push(file.name || "file");
          continue;
        }
        const main = uploaded[0];

        // 2) Derive a thumbnail. Images preview themselves; PDFs render page 1.
        let thumbnailPath: string | null = null;
        if (file.type.startsWith("image/")) {
          thumbnailPath = main.storage_path;
        } else {
          const blob = await generateFileThumbnail(file);
          if (blob) {
            const thumbFile = new File([blob], `${main.file_name}.png`, {
              type: "image/png",
            });
            const { uploaded: tu } = await uploadFiles(supabase, {
              bucket: "course-files",
              prefix: `${courseId}/_thumbs`,
              files: [thumbFile],
            });
            thumbnailPath = tu[0]?.storage_path ?? null;
          }
        }

        // 3) Record the row.
        const res = await recordCourseResource({
          courseId,
          title: null,
          storagePath: main.storage_path,
          fileName: main.file_name,
          mimeType: main.mime_type,
          sizeBytes: main.size_bytes,
          thumbnailPath,
        });
        if (res.error) failedNames.push(file.name || main.file_name);
      }

      if (failedNames.length > 0) {
        setError(
          `${failedNames.length} file${failedNames.length > 1 ? "s" : ""} didn't upload.`,
        );
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
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-surface-2">
                  {r.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbnail_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-faint">FILE</span>
                  )}
                </span>
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
          "cursor-pointer rounded-md border border-dashed px-4 py-6 text-center transition-colors focus:border-accent focus:outline-none",
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
          Any file type · PDFs get a first-page preview automatically
        </p>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
