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
