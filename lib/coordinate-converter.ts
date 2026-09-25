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

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Ukuran bounding box axis-aligned dari persegi w×h yang diputar degrees. */
export function rotatedBBox(
  width: number,
  height: number,
  degrees: number,
): { width: number; height: number } {
  const normalized = ((degrees % 360) + 360) % 360;
  const rad = degToRad(normalized);
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

export type Point = { x: number; y: number };

/**
 * Putar titik (px,py) mengelilingi pusat (cx,cy) sebesar degrees.
 * Konvensi layar (y ke bawah): sudut positif = searah jarum jam,
 * sama seperti CSS transform rotate dan canvas ctx.rotate.
 */
export function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  degrees: number,
): Point {
  const rad = degToRad(degrees);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/**
 * Empat sudut box (x,y,w,h) setelah diputar degrees mengelilingi
 * titik tengahnya. Urutan: TL, TR, BR, BL (frame Belum diputar).
 */
export function rotatedCorners(
  x: number,
  y: number,
  width: number,
  height: number,
  degrees: number,
): Point[] {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return [
    rotatePoint(x, y, cx, cy, degrees),
    rotatePoint(x + width, y, cx, cy, degrees),
    rotatePoint(x + width, y + height, cx, cy, degrees),
    rotatePoint(x, y + height, cx, cy, degrees),
  ];
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