import { PDFDocument } from "pdf-lib";
import type { Overlay } from "@/types/overlay";
import { overlayPdfBox } from "@/lib/coordinate-converter";
import { renderOverlayToCanvas } from "@/lib/overlay-renderer";

export type ExportProgress = (message: string) => void;

function canvasToPngBytes(canvas: HTMLCanvasElement): Uint8Array {
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function exportPdfWithOverlays(
  source: ArrayBuffer | Uint8Array,
  overlays: Overlay[],
  images: Record<string, HTMLImageElement | null>,
  onProgress?: ExportProgress,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(source, {
    ignoreEncryption: false,
  });

  const pages = pdfDoc.getPages();
  const visibleOverlays = overlays.filter((o) => o.visible !== false);
  const imageCache = new Map<string, Promise<import("pdf-lib").PDFImage>>();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    onProgress?.(`Menerapkan overlay ke halaman ${i + 1} dari ${pages.length}...`);

    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    for (const overlay of visibleOverlays) {
      const box = overlayPdfBox(overlay, pdfWidth, pdfHeight);
      const outWidth = Math.max(1, Math.round(box.width));
      const outHeight = Math.max(1, Math.round(box.height));

      const cacheKey = `${overlay.id}-${outWidth}x${outHeight}`;
      let pdfImagePromise = imageCache.get(cacheKey);
      if (!pdfImagePromise) {
        const canvas = renderOverlayToCanvas(
          overlay,
          outWidth,
          outHeight,
          images[overlay.id] ?? null,
        );
        pdfImagePromise = pdfDoc.embedPng(canvasToPngBytes(canvas));
        imageCache.set(cacheKey, pdfImagePromise);
      }
      const pdfImage = await pdfImagePromise;

      page.drawImage(pdfImage, {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        opacity: 1,
      });
    }
  }

  onProgress?.("PDF berhasil dibuat.");
  return pdfDoc.save();
}
