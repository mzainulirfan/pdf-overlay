export type OverlayType = "text" | "image" | "shape";

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
