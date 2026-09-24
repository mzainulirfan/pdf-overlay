export type OverlayType = "text" | "image";

export type Rotation = 0 | 90 | 180 | 270;

export type Overlay = {
  id: string;
  type: OverlayType;

  text?: string;
  imageUrl?: string;
  imageBytes?: ArrayBuffer;

  /** Posisi kiri-atas dalam koordinat preview, dinormalisasi 0–1. */
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;

  rotation: Rotation;
  opacity: number;

  /** false = disembunyikan dari preview & hasil export. */
  visible: boolean;

  applyMode: "all-pages";
};

export const DEFAULT_OVERLAY_TEXT = "FRAGILE";

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
