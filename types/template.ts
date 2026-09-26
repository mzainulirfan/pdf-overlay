import {
  DEFAULT_STROKE_RATIO,
  normalizeRotation,
  type Overlay,
  type Rotation,
  type ShapeFillMode,
  type ShapeKind,
  type TextCase,
} from "@/types/overlay";

/** Bagian overlay yang bisa diserialisasi ke localStorage. */
export type StoredOverlay = {
  type: "text" | "image" | "shape";
  name?: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  textCase?: TextCase;
  shape?: ShapeKind;
  fillMode?: ShapeFillMode;
  strokeRatio?: number;
  text?: string;
  imageDataUrl?: string;
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  rotation: Rotation;
  opacity: number;
  visible?: boolean;
  locked?: boolean;
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
      name: o.name,
      bold: o.bold,
      italic: o.italic,
      strikethrough: o.strikethrough,
      textCase: o.textCase,
      shape: o.shape,
      fillMode: o.fillMode,
      strokeRatio: o.strokeRatio,
      text: o.text,
      imageDataUrl: o.type === "image" ? o.imageUrl : undefined,
      xRatio: o.xRatio,
      yRatio: o.yRatio,
      widthRatio: o.widthRatio,
      heightRatio: o.heightRatio,
      rotation: o.rotation,
      opacity: o.opacity,
      visible: o.visible,
      locked: o.locked ?? false,
    })),
  };
}

export function overlayFromStored(
  stored: StoredOverlay,
  id: string,
): Overlay {
  const shape: ShapeKind =
    stored.shape === "ellipse" ||
    stored.shape === "line" ||
    stored.shape === "arrow"
      ? stored.shape
      : "rect";
  const fillMode: ShapeFillMode =
    stored.fillMode === "outline" ? "outline" : "solid";
  const textCase: TextCase | undefined =
    stored.textCase === "upper" ||
    stored.textCase === "lower" ||
    stored.textCase === "capitalize"
      ? stored.textCase
      : undefined;
  return {
    id,
    type: stored.type,
    name: stored.name,
    bold: stored.bold,
    italic: stored.italic,
    strikethrough: stored.strikethrough,
    textCase,
    shape,
    fillMode,
    strokeRatio:
      typeof stored.strokeRatio === "number" &&
      Number.isFinite(stored.strokeRatio) &&
      stored.strokeRatio > 0
        ? stored.strokeRatio
        : DEFAULT_STROKE_RATIO,
    text: stored.text,
    imageUrl: stored.imageDataUrl,
    xRatio: stored.xRatio,
    yRatio: stored.yRatio,
    widthRatio: stored.widthRatio,
    heightRatio: stored.heightRatio,
    rotation: normalizeRotation(stored.rotation),
    opacity: stored.opacity,
    visible: stored.visible ?? true,
    locked: stored.locked ?? false,
    applyMode: "all-pages",
  };
}
