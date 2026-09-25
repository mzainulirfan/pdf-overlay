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
  type PlacedImage = {
    image: Promise<import("pdf-lib").PDFImage>;
    width: number;
    height: number;
  };
  const imageCache = new Map<string, PlacedImage>();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    onProgress?.(`Menerapkan overlay ke halaman ${i + 1} dari ${pages.length}...`);

    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    for (const overlay of visibleOverlays) {
      const box = overlayPdfBox(overlay, pdfWidth, pdfHeight);
      const outWidth = Math.max(1, Math.round(box.width));
      const outHeight = Math.max(1, Math.round(box.height));

      const cacheKey = `${overlay.id}-${outWidth}x${outHeight}`;
      let placed = imageCache.get(cacheKey);
      if (!placed) {
        // Render memakai sudut overlay sehingga canvas berukuran
        // bounding box konten terotasi (tanpa clipping sudut).
        const rendered = renderOverlayToCanvas(
          overlay,
          outWidth,
          outHeight,
          images[overlay.id] ?? null,
        );
        placed = {
          image: pdfDoc.embedPng(canvasToPngBytes(rendered.canvas)),
          width: rendered.canvas.width,
          height: rendered.canvas.height,
        };
        imageCache.set(cacheKey, placed);
      }
      const pdfImage = await placed.image;

      // Samakan titik tengah: bbox digambar mengelilingi pusat box
      // (koordinat PDF memakai titik kiri-bawah sebagai origin).
      page.drawImage(pdfImage, {
        x: box.x + box.width / 2 - placed.width / 2,
        y: box.y + box.height / 2 - placed.height / 2,
        width: placed.width,
        height: placed.height,
        opacity: 1,
      });
    }
  }

  onProgress?.("PDF berhasil dibuat.");
  return pdfDoc.save();
}
