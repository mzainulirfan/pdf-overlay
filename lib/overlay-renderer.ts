import type { Overlay } from "@/types/overlay";

const FONT_FAMILY = '"Arial", "Helvetica Neue", Helvetica, system-ui, sans-serif';

export async function loadImageFromOverlay(overlay: Overlay): Promise<HTMLImageElement> {
  if (!overlay.imageUrl) {
    throw new Error("Gambar overlay tidak tersedia.");
  }
  const img = new Image();
  img.src = overlay.imageUrl;
  await img.decode();
  return img;
}

/**
 * Merender overlay (teks atau gambar) ke sebuah canvas berukuran outWidth x outHeight.
 * Fungsi ini dipakai untuk preview maupun export sehingga hasilnya konsisten.
 * Konten diputar di sekitar pusat kotak overlay.
 */
export function renderOverlayToCanvas(
  overlay: Overlay,
  outWidth: number,
  outHeight: number,
  image?: HTMLImageElement | null,
): HTMLCanvasElement {
  const width = Math.max(1, Math.round(outWidth));
  const height = Math.max(1, Math.round(outHeight));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0.1, overlay.opacity));

  const rad = (overlay.rotation * Math.PI) / 180;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(rad);
  ctx.translate(-width / 2, -height / 2);

  if (overlay.type === "text") {
    drawText(ctx, overlay.text || "", width, height);
  } else if (overlay.type === "image") {
    drawImage(ctx, image, width, height);
  }

  ctx.restore();
  return canvas;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
) {
  const targetWidth = width * 0.94;
  const targetHeight = height * 0.94;
  const lines = text.split("\n");

  const rawLineHeight = 1.2;
  let fontSize = Math.max(8, targetHeight / Math.max(1, lines.length));
  let maxLineWidth = 0;
  for (const line of lines) {
    maxLineWidth = Math.max(maxLineWidth, measureTextWidth(ctx, line, fontSize));
  }
  if (maxLineWidth > targetWidth) {
    fontSize *= targetWidth / maxLineWidth;
  }

  const totalHeight = lines.length * fontSize * rawLineHeight;
  if (totalHeight > targetHeight) {
    fontSize *= targetHeight / totalHeight;
  }
  fontSize = Math.max(8, fontSize);

  ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#000000";

  const lineHeight = fontSize * rawLineHeight;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight);
  });
}

function measureTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
): number {
  ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
  return ctx.measureText(text).width;
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null | undefined,
  width: number,
  height: number,
) {
  if (!image || image.width === 0) return;

  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const dx = (width - drawWidth) / 2;
  const dy = (height - drawHeight) / 2;

  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
}
