export type OverlayType = "text" | "image" | "shape";

export type TextCase = "none" | "upper" | "lower" | "capitalize";

/** Area crop sebagai fraksi dimensi alami gambar (0–1). */
export type CropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function normalizeCropRect(raw: unknown): CropRect | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const c = raw as Record<string, unknown>;
  const nums = [c.x, c.y, c.w, c.h];
  if (!nums.every((n) => typeof n === "number" && Number.isFinite(n))) {
    return undefined;
  }
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const w = Math.min(1, Math.max(0.01, c.w as number));
  const h = Math.min(1, Math.max(0.01, c.h as number));
  return {
    x: clamp01(c.x as number),
    y: clamp01(c.y as number),
    w,
    h,
  };
}

export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";

export type ShapeFillMode = "solid" | "outline";

export const DEFAULT_STROKE_RATIO = 0.04;

/** Derajat rotasi bebas, dinormalisasi ke 0–359 via normalizeRotation. */
export type Rotation = number;

export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees % 360) + 360) % 360;
}

export type Overlay = {
  id: string;
  type: OverlayType;

  /** Nama kustom layer; kosong = ikut isi/nomor otomatis. */
  name?: string;

  text?: string;
  imageUrl?: string;
  imageBytes?: ArrayBuffer;

  /** Gaya font teks (default: bold, tidak miring, tanpa coret). */
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  /** Kapitalisasi tampilan teks (default: apa adanya). */
  textCase?: TextCase;
  /** Crop gambar (default: seluruh gambar, mode contain). */
  crop?: CropRect;

  /** Jenis bentuk (hanya untuk type "shape"). */
  shape?: ShapeKind;
  /** Penuh atau garis tepi saja (rect/ellipse). */
  fillMode?: ShapeFillMode;
  /** Tebal garis sebagai fraksi sisi terkecil box. */
  strokeRatio?: number;

  /** Posisi kiri-atas dalam koordinat preview, dinormalisasi 0–1. */
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;

  rotation: Rotation;
  opacity: number;

  /** false = disembunyikan dari preview & hasil export. */
  visible: boolean;

  /** true = tidak bisa digeser/di-resize (tetap bisa dihapus). */
  locked?: boolean;

  applyMode: "all-pages";
};

export const DEFAULT_OVERLAY_TEXT = "FRAGILE";

export function createShapeOverlay(kind: ShapeKind = "rect"): Overlay {
  return {
    id: `overlay-${crypto.randomUUID()}`,
    type: "shape",
    shape: kind,
    xRatio: 0.35,
    yRatio: 0.45,
    widthRatio: 0.3,
    heightRatio: 0.15,
    rotation: 0,
    opacity: 0.5,
    visible: true,
    applyMode: "all-pages",
  };
}

export function createTextOverlay(
  text: string = DEFAULT_OVERLAY_TEXT,
): Overlay {
  return {
    id: `overlay-${crypto.randomUUID()}`,
    type: "text",
    text,
    xRatio: 0.375,
    yRatio: 0.45,
    widthRatio: 0.25,
    heightRatio: 0.1,
    rotation: 0,
    opacity: 1,
    visible: true,
    applyMode: "all-pages",
  };
}
