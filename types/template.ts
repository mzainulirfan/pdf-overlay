import type { Overlay, Rotation } from "@/types/overlay";

/** Bagian overlay yang bisa diserialisasi ke localStorage. */
export type StoredOverlay = {
  type: "text" | "image";
  text?: string;
  imageDataUrl?: string;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  rotation: Rotation;
  opacity: number;
  visible?: boolean;
};

export type OverlayTemplate = {
  id: string;
  name: string;
  overlays: StoredOverlay[];
};

export function templateFromOverlays(
  overlays: Overlay[],
  name: string,
): OverlayTemplate {
  return {
    id: `template-${crypto.randomUUID()}`,
    name,
    overlays: overlays.map((o) => ({
      type: o.type,
      text: o.text,
      imageDataUrl: o.type === "image" ? o.imageUrl : undefined,
      xRatio: o.xRatio,
      yRatio: o.yRatio,
      widthRatio: o.widthRatio,
      heightRatio: o.heightRatio,
      rotation: o.rotation,
      opacity: o.opacity,
      visible: o.visible,
    })),
  };
}

export function overlayFromStored(
  stored: StoredOverlay,
  id: string,
): Overlay {
  return {
    id,
    type: stored.type,
    text: stored.text,
    imageUrl: stored.imageDataUrl,
    xRatio: stored.xRatio,
    yRatio: stored.yRatio,
    widthRatio: stored.widthRatio,
    heightRatio: stored.heightRatio,
    rotation: stored.rotation,
    opacity: stored.opacity,
    visible: stored.visible ?? true,
    applyMode: "all-pages",
  };
}
