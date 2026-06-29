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

export interface UploadResult {
  uploaded: number;
  /** Display names of files that failed to upload. */
  failed: string[];
}

/**
 * Upload ticket attachments straight from the browser to Supabase Storage,
 * then record their metadata rows. Runs with the user's session, so storage +
 * row RLS both apply. Object path convention: {orgId}/{ticketId}/{filename}.
 *
 * Doing this client-side (rather than through a Server Action) is what lets
 * large phone photos through — Server Actions cap the request body well below
 * a typical camera image.
 */
export async function uploadTicketAttachments(
  supabase: BrowserClient,
  opts: { orgId: string; ticketId: string; files: File[] },
): Promise<UploadResult> {
  const { orgId, ticketId, files } = opts;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? null;

  const failed: string[] = [];
  let uploaded = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const displayName = file.name || `photo-${i + 1}.jpg`;
    const path = `${orgId}/${ticketId}/${Date.now()}-${i + 1}-${sanitize(displayName)}`;

    const { error: upErr } = await supabase.storage
      .from("ticket-attachments")
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
    if (upErr) {
      failed.push(displayName);
      continue;
    }

    const { error: rowErr } = await supabase.from("ticket_attachments").insert({
      ticket_id: ticketId,
      storage_path: path,
      file_name: displayName,
      uploaded_by: uid,
    });
    if (rowErr) {
      failed.push(displayName);
      continue;
    }

    uploaded++;
  }

  return { uploaded, failed };
}
