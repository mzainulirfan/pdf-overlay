import type { Overlay } from "@/types/overlay";
import { DEFAULT_STROKE_RATIO, normalizeRotation } from "@/types/overlay";
import { rotatedBBox } from "@/lib/coordinate-converter";

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

export type RenderedOverlay = {
  canvas: HTMLCanvasElement;
  /** Offset kiri-atas canvas relatif ke kiri-atas box (bisa negatif bila miring). */
  dx: number;
  dy: number;
};

/**
 * Merender overlay ke canvas seukuran bounding box konten terotasi.
 * Fungsi ini dipakai untuk preview maupun export sehingga hasilnya konsisten.
 * Rotasi 0° menghasilkan canvas tepat seukuran box (dx = dy = 0).
 */
export function renderOverlayToCanvas(
  overlay: Overlay,
  outWidth: number,
  outHeight: number,
  image?: HTMLImageElement | null,
): RenderedOverlay {
  const width = Math.max(1, Math.round(outWidth));
  const height = Math.max(1, Math.round(outHeight));
  const rotation = normalizeRotation(overlay.rotation);

  const bb = rotatedBBox(width, height, rotation);
  const bw = Math.max(1, Math.round(bb.width));
  const bh = Math.max(1, Math.round(bb.height));

  const canvas = document.createElement("canvas");
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { canvas, dx: 0, dy: 0 };

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0.1, overlay.opacity));

  const rad = (rotation * Math.PI) / 180;
  ctx.translate(bw / 2, bh / 2);
  ctx.rotate(rad);
  ctx.translate(-width / 2, -height / 2);

  if (overlay.type === "text") {
    drawText(ctx, overlay.text || "", width, height);
  } else if (overlay.type === "image") {
    drawImage(ctx, image, width, height);
  } else if (overlay.type === "shape") {
    drawShape(ctx, overlay, width, height);
  }

  ctx.restore();
  return { canvas, dx: (width - bw) / 2, dy: (height - bh) / 2 };
}

/**
 * Membungkus satu paragraf menjadi beberapa baris (greedy word-wrap).
 * Kata yang sendirian melebihi lebar box dipecah per karakter agar
 * teks tanpa spasi (mis. "HANDLEWITHCARE") tetap terbungkus.
 */
function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  const words: string[] = [];
  for (const word of paragraph.split(/\s+/)) {
    if (!word) continue;
    if (measureTextWidth(ctx, word, fontSize) <= maxWidth) {
      words.push(word);
      continue;
    }
    let chunk = "";
    for (const ch of word) {
      if (chunk === "" || measureTextWidth(ctx, chunk + ch, fontSize) <= maxWidth) {
        chunk += ch;
      } else {
        words.push(chunk);
        chunk = ch;
      }
    }
    if (chunk) words.push(chunk);
  }

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (!current || measureTextWidth(ctx, trial, fontSize) <= maxWidth) {
      current = trial;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
) {
  const targetWidth = width * 0.94;
  const targetHeight = height * 0.94;
  const rawLineHeight = 1.2;
  const MIN_FONT = 8;

  // "\n" manual tetap jadi jeda keras; paragraf kosong jadi baris spasi.
  const wrapAll = (fontSize: number): string[] =>
    text
      .split("\n")
      .flatMap((p) => (p.trim() === "" ? [""] : wrapParagraph(ctx, p, targetWidth, fontSize)));

  // Cari font terbesar yang muat: bungkus lalu kecilkan hingga pas.
  let fontSize = Math.max(MIN_FONT, targetHeight);
  let lines = wrapAll(fontSize);
  for (let i = 0; i < 60; i++) {
    let widest = 0;
    for (const line of lines) {
      widest = Math.max(widest, measureTextWidth(ctx, line, fontSize));
    }
    const fits =
      widest <= targetWidth &&
      lines.length * fontSize * rawLineHeight <= targetHeight;
    if (fits) break;
    const next = fontSize * 0.94;
    if (next < MIN_FONT) break;
    fontSize = next;
    lines = wrapAll(fontSize);
  }
  fontSize = Math.max(MIN_FONT, fontSize);
  lines = wrapAll(fontSize);

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

/**
 * Bentuk hitam seukuran box: persegi, elips, garis, atau panah.
 * Transparansi diatur lewat globalAlpha (slider opacity overlay).
 * Tebal garis = fraksi sisi terkecil box agar konsisten di semua skala.
 */
function drawShape(
  ctx: CanvasRenderingContext2D,
  overlay: Overlay,
  width: number,
  height: number,
) {
  const kind = overlay.shape ?? "rect";
  const outline = (overlay.fillMode ?? "solid") === "outline";
  const ratio =
    typeof overlay.strokeRatio === "number" &&
    Number.isFinite(overlay.strokeRatio) &&
    overlay.strokeRatio > 0
      ? overlay.strokeRatio
      : DEFAULT_STROKE_RATIO;
  const sw = Math.max(1, ratio * Math.min(width, height));

  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = sw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (kind === "line" || kind === "arrow") {
    const pad = width * 0.04;
    const y = height / 2;
    const x1 = pad;
    const x2 = width - pad;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    if (kind === "arrow") {
      const headLen = Math.max(4 * sw, 8);
      const headAngle = Math.PI / 7;
      const baseAngle = 0;
      ctx.beginPath();
      ctx.moveTo(x2, y);
      ctx.lineTo(
        x2 - headLen * Math.cos(headAngle - baseAngle),
        y - headLen * Math.sin(headAngle - baseAngle),
      );
      ctx.moveTo(x2, y);
      ctx.lineTo(
        x2 - headLen * Math.cos(headAngle + baseAngle),
        y + headLen * Math.sin(headAngle + baseAngle),
      );
      ctx.stroke();
    }
    return;
  }

  if (kind === "ellipse") {
    ctx.beginPath();
    if (outline) {
      ctx.ellipse(width / 2, height / 2, (width - sw) / 2, (height - sw) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (outline) {
    ctx.strokeRect(sw / 2, sw / 2, width - sw, height - sw);
  } else {
    ctx.fillRect(0, 0, width, height);
  }
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
