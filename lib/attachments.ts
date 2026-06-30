import type { createClient } from "@/lib/supabase/client";

type BrowserClient = ReturnType<typeof createClient>;

/** Storage object keys must be path-safe; keep names readable but ASCII. */
function sanitize(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "file";
}

export interface UploadedFile {
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
}

export interface UploadFilesResult {
  uploaded: UploadedFile[];
  /** Display names of files that failed to upload. */
  failed: string[];
}

/**
 * Upload files straight from the browser to a Storage bucket under
 * `{prefix}/{timestamped-name}`, returning metadata for the DB rows the caller
 * should then insert. Runs with the user's session, so storage RLS applies.
 *
 * Doing this client-side (rather than through a Server Action) is what lets
 * large files through — Server Actions cap the request body well below a
 * typical camera image or PDF.
 */
export async function uploadFiles(
  supabase: BrowserClient,
  opts: { bucket: string; prefix: string; files: File[] },
): Promise<UploadFilesResult> {
  const { bucket, prefix, files } = opts;
  const uploaded: UploadedFile[] = [];
  const failed: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const displayName = file.name || `file-${i + 1}`;
    const path = `${prefix}/${Date.now()}-${i + 1}-${sanitize(displayName)}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
    if (error) {
      failed.push(displayName);
      continue;
    }

    uploaded.push({
      storage_path: path,
      file_name: displayName,
      mime_type: file.type || null,
      size_bytes: file.size,
    });
  }

  return { uploaded, failed };
}

export interface UploadResult {
  uploaded: number;
  /** Display names of files that failed to upload. */
  failed: string[];
}

/**
 * Upload ticket attachments to the `ticket-attachments` bucket, then record
 * their metadata rows. Object path convention: {orgId}/{ticketId}/{filename}.
 */
export async function uploadTicketAttachments(
  supabase: BrowserClient,
  opts: { orgId: string; ticketId: string; files: File[] },
): Promise<UploadResult> {
  const { orgId, ticketId, files } = opts;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? null;

  const { uploaded, failed } = await uploadFiles(supabase, {
    bucket: "ticket-attachments",
    prefix: `${orgId}/${ticketId}`,
    files,
  });

  let recorded = 0;
  for (const f of uploaded) {
    const { error } = await supabase.from("ticket_attachments").insert({
      ticket_id: ticketId,
      storage_path: f.storage_path,
      file_name: f.file_name,
      uploaded_by: uid,
    });
    if (error) {
      failed.push(f.file_name);
      continue;
    }
    recorded++;
  }

  return { uploaded: recorded, failed };
}
