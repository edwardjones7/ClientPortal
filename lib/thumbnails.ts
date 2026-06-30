/**
 * Client-side thumbnail generation. Runs in the browser only (uses canvas +
 * pdf.js). Every function returns null on any failure so the caller can treat a
 * missing thumbnail as a non-event — the file still uploads fine.
 */

/** Render page 1 of a PDF File to a PNG Blob. */
export async function generatePdfThumbnail(file: File): Promise<Blob | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    // The worker is resolved by the bundler to a hashed asset URL.
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(1);

    const base = page.getViewport({ scale: 1 });
    const targetWidth = 480;
    const viewport = page.getViewport({ scale: targetWidth / base.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await page.render({ canvasContext: ctx, viewport }).promise;
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
  } catch {
    return null;
  }
}

/**
 * Build a thumbnail for an arbitrary file when we can:
 *  - PDF → first page rendered to PNG.
 *  - (images are handled by the caller — the image is its own thumbnail.)
 * Returns a PNG Blob or null when no thumbnail can be produced.
 */
export async function generateFileThumbnail(file: File): Promise<Blob | null> {
  if (file.type === "application/pdf") return generatePdfThumbnail(file);
  return null;
}
