import type { Overlay } from "@/types/overlay";

/** Mengubah koordinat pixel preview menjadi nilai rasio (0–1). */
export function ratiosFromPixel(
  x: number,
  y: number,
  width: number,
  height: number,
  previewWidth: number,
  previewHeight: number,
): Pick<Overlay, "xRatio" | "yRatio" | "widthRatio" | "heightRatio"> {
  return {
    xRatio: clampRatio(x / previewWidth),
    yRatio: clampRatio(y / previewHeight),
    widthRatio: clampRatio(width / previewWidth),
    heightRatio: clampRatio(height / previewHeight),
  };
}

export function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export type PixelBox = { x: number; y: number; width: number; height: number };

/** Mengubah nilai rasio overlay menjadi kotak pixel dalam ukuran preview. */
export function overlayPixelBox(
  overlay: Overlay,
  previewWidth: number,
  previewHeight: number,
): PixelBox {
  return {
    x: overlay.xRatio * previewWidth,
    y: overlay.yRatio * previewHeight,
    width: overlay.widthRatio * previewWidth,
    height: overlay.heightRatio * previewHeight,
  };
}

export type PdfBox = { x: number; y: number; width: number; height: number };

/**
 * Mengubah rasio overlay menjadi kotak koordinat PDF.
 * Koordinat PDF memakai titik kiri-bawah sebagai origin.
 */
export function overlayPdfBox(
  overlay: Overlay,
  pdfWidth: number,
  pdfHeight: number,
): PdfBox {
  const width = overlay.widthRatio * pdfWidth;
  const height = overlay.heightRatio * pdfHeight;
  const x = overlay.xRatio * pdfWidth;
  const yTop = overlay.yRatio * pdfHeight;
  const y = pdfHeight - yTop - height;
  return { x, y, width, height };
}