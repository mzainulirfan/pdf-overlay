"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CropRect, Overlay } from "@/types/overlay";
import { normalizeRotation } from "@/types/overlay";
import { renderOverlayToCanvas } from "@/lib/overlay-renderer";
import { degToRad, rotatedBBox } from "@/lib/coordinate-converter";

export type PixelFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MIN_SIZE = 12;
const MIN_CROP = 0.05;

/** Crop penuh (cover) yang memenuhi aspek box, terpusat. */
function defaultFullCrop(boxAspect: number, aspectImg: number): CropRect {
  const r = boxAspect * Math.max(0.01, aspectImg);
  if (r >= 1) return { x: 0, y: (1 - 1 / r) / 2, w: 1, h: 1 / r };
  return { x: (1 - r) / 2, y: 0, w: r, h: 1 };
}

/** Path Heroicons (outline) — solid hanya untuk gembok. */
const BAR_PATHS = {
  reset:
    "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99",
  duplicate:
    "M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-7.5a2.25 2.25 0 0 1 2.25-2.25h6Z",
  lockClosed:
    "M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z",
  lockOpen:
    "M18 1.5c2.9 0 5.25 2.35 5.25 5.25v3.75a.75.75 0 0 1-1.5 0V6.75a3.75 3.75 0 1 0-7.5 0v3a3 3 0 0 1 3 3v6.75a3 3 0 0 1-3 3H3.75a3 3 0 0 1-3-3v-6.75a3 3 0 0 1 3-3h9v-3c0-2.9 2.35-5.25 5.25-5.25Z",
  eye: "M2.05 12.55a1 1 0 0 1 0-.1 11.36 11.36 0 0 1 19.9 0 1 1 0 0 1 0 .1 11.36 11.36 0 0 1-19.9 0zm9.95 3.45a4 4 0 1 1 0-8 4 4 0 0 1 0 8z",
  eyeSlash:
    "M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88",
  x: "M6 18L18 6M6 6l12 12",
} as const;

function BarButton({
  label,
  title,
  pressed,
  disabled,
  solid,
  onPress,
  path,
  icon,
}: {
  label: string;
  title: string;
  pressed?: boolean;
  disabled?: boolean;
  solid?: boolean;
  onPress: () => void;
  path?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onPress}
      aria-label={label}
      title={title}
      aria-pressed={pressed}
      disabled={disabled}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        pressed
          ? "bg-white/15 text-white"
          : "text-neutral-300 hover:bg-neutral-700 hover:text-white"
      }`}
    >
      {icon ??
        (path &&
          (solid ? (
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path fillRule="evenodd" d={path} clipRule="evenodd" />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={path} />
            </svg>
          )))}
    </button>
  );
}

type OverlayContextBarProps = {
  overlay: Overlay;
  onReset: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onCrop: (() => void) | null;
};

function CropMarkIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3v4H3M17 3v4h4M7 21v-4H3M17 21v-4h4"
      />
    </svg>
  );
}

/**
 * Bar aksi melayang. State konfirmasi hapus disimpan di sini sehingga
 * otomatis reset saat seleksi berpindah (unmount).
 */
function OverlayContextBar({
  overlay,
  onReset,
  onDuplicate,
  onToggleLock,
  onToggleVisibility,
  onDelete,
  onCrop,
}: OverlayContextBarProps) {
  const [armed, setArmed] = useState(false);
  const armTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (armTimerRef.current) window.clearTimeout(armTimerRef.current);
    },
    [],
  );

  const disarm = () => {
    if (armTimerRef.current) {
      window.clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
    setArmed(false);
  };

  const requestDelete = () => {
    if (armed) {
      disarm();
      onDelete();
      return;
    }
    if (armTimerRef.current) window.clearTimeout(armTimerRef.current);
    setArmed(true);
    armTimerRef.current = window.setTimeout(() => {
      armTimerRef.current = null;
      setArmed(false);
    }, 5000);
  };

  const isLocked = !!overlay.locked;
  const isVisible = overlay.visible !== false;

  return (
    <div
      role={armed ? "alertdialog" : "toolbar"}
      aria-label={
        armed ? "Konfirmasi hapus overlay" : "Aksi cepat overlay terpilih"
      }
      className={`animate-fade-in flex items-center gap-0.5 overflow-hidden rounded-full border bg-black/85 p-0.5 shadow-lg backdrop-blur ${
        armed ? "border-red-500/60" : "border-neutral-700"
      }`}
    >
      {armed ? (
        <>
          <span className="whitespace-nowrap py-1 pl-2.5 pr-1 text-xs font-medium text-white">
            Hapus overlay ini?
          </span>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={requestDelete}
            className="shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-500"
          >
            Ya, hapus
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={disarm}
            aria-label="Batal menghapus overlay"
            className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
          >
            Batal
          </button>
        </>
      ) : (
        <>
          <BarButton
            label="Reset tampilan overlay"
            title={
              isLocked
                ? "Buka kunci dulu untuk me-reset"
                : "Reset tampilan (posisi, ukuran, rotasi & transparansi)"
            }
            disabled={isLocked}
            onPress={onReset}
            path={BAR_PATHS.reset}
          />
          <BarButton
            label="Duplikat overlay"
            title="Duplikat overlay"
            onPress={onDuplicate}
            path={BAR_PATHS.duplicate}
          />
          {overlay.type === "image" && onCrop && !isLocked && (
            <BarButton
              label="Potong gambar"
              title="Potong gambar (crop)"
              onPress={onCrop}
              icon={<CropMarkIcon />}
            />
          )}
          <span className="h-4 w-px shrink-0 bg-neutral-700" aria-hidden />
          <BarButton
            label={isLocked ? "Buka kunci overlay" : "Kunci overlay"}
            title={isLocked ? "Buka kunci" : "Kunci posisi"}
            pressed={isLocked}
            solid
            onPress={onToggleLock}
            path={isLocked ? BAR_PATHS.lockClosed : BAR_PATHS.lockOpen}
          />
          <BarButton
            label={isVisible ? "Sembunyikan overlay" : "Tampilkan overlay"}
            title={isVisible ? "Sembunyikan" : "Tampilkan"}
            pressed={!isVisible}
            onPress={onToggleVisibility}
            path={isVisible ? BAR_PATHS.eye : BAR_PATHS.eyeSlash}
          />
          <span className="h-4 w-px shrink-0 bg-neutral-700" aria-hidden />
          <BarButton
            label="Hapus overlay"
            title="Hapus overlay (bisa diurungkan)"
            onPress={requestDelete}
            path={BAR_PATHS.x}
          />
        </>
      )}
    </div>
  );
}

/**
 * Editor crop inline: gambar penuh diredupkan, kotak crop (terkunci ke
 * aspek box) bisa digeser + di-resize dari 4 sudutnya. Setiap perubahan
 * langsung ditulis ke overlay.crop sehingga hasilnya realtime.
 */
function CropEditor({
  image,
  width,
  height,
  crop,
  onCropLive,
}: {
  image: HTMLImageElement;
  width: number;
  height: number;
  crop: CropRect;
  onCropLive: (crop: CropRect) => void;
}) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const s = Math.min(width / Math.max(1, iw), height / Math.max(1, ih));
  const dw = Math.max(1, iw * s);
  const dh = Math.max(1, ih * s);
  const ox = (width - dw) / 2;
  const oy = (height - dh) / 2;

  type CropGesture =
    | { mode: "move"; sx: number; sy: number; orig: CropRect }
    | { mode: "resize"; cfx: number; cfy: number; anchor: { x: number; y: number } };
  const gestureRef = useRef<CropGesture | null>(null);

  const clampCrop = (r: CropRect): CropRect => {
    const w = Math.min(1, Math.max(MIN_CROP, r.w));
    const h = Math.min(1, Math.max(MIN_CROP, r.h));
    return {
      x: Math.min(1 - w, Math.max(0, r.x)),
      y: Math.min(1 - h, Math.max(0, r.y)),
      w,
      h,
    };
  };

  const beginCropGesture = (
    e: React.PointerEvent,
    gesture: CropGesture,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    gestureRef.current = gesture;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const endCropGesture = () => {
    gestureRef.current = null;
  };

  const onCropMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g) return;
    const el = e.currentTarget as HTMLElement;
    // Root editing memakai elemen terdekat ber-relatif untuk koordinat.
    const root = el.closest("[data-crop-root]") as HTMLElement | null;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const fx = (e.clientX - r.left - ox) / dw;
    const fy = (e.clientY - r.top - oy) / dh;
    if (g.mode === "move") {
      const dx = fx - g.sx;
      const dy = fy - g.sy;
      onCropLive(
        clampCrop({ ...g.orig, x: g.orig.x + dx, y: g.orig.y + dy }),
      );
      return;
    }
    // Resize: jaga aspek crop terhadap box. Sudut bebas dua sumbu,
    // tepi (0.5) hanya satu sumbu — sisi lainnya mengikuti rasio.
    const boxAspect = height > 0 ? width / height : 1;
    const ratio = boxAspect * (ih / Math.max(1, iw));
    const rawW = Math.abs(fx - g.anchor.x);
    const rawH = Math.abs(fy - g.anchor.y);
    let nw: number;
    let nh: number;
    if (g.cfx === 0.5) {
      nh = Math.max(rawH, MIN_CROP);
      nw = nh * ratio;
    } else if (g.cfy === 0.5) {
      nw = Math.max(rawW, MIN_CROP);
      nh = nw / ratio;
    } else {
      nw = Math.max(rawW, MIN_CROP);
      nh = nw / ratio;
    }
    let nx =
      g.cfx === 1
        ? g.anchor.x
        : g.cfx === 0
          ? g.anchor.x - nw
          : g.anchor.x - nw / 2;
    let ny =
      g.cfy === 1
        ? g.anchor.y
        : g.cfy === 0
          ? g.anchor.y - nh
          : g.anchor.y - nh / 2;
    nx = Math.min(1, Math.max(0, nx));
    ny = Math.min(1, Math.max(0, ny));
    nw = Math.min(nw, 1 - nx);
    nh = Math.min(nh, 1 - ny);
    nw = Math.max(nw, MIN_CROP);
    nh = Math.max(nh, MIN_CROP);
    onCropLive({
      x: Math.min(nx, 1 - nw),
      y: Math.min(ny, 1 - nh),
      w: nw,
      h: nh,
    });
  };

  const rx = ox + crop.x * dw;
  const ry = oy + crop.y * dh;
  const rw = crop.w * dw;
  const rh = crop.h * dh;

  return (
    <div
      data-crop-root
      className="absolute touch-none select-none"
      style={{ left: 0, top: 0, width, height }}
      onPointerDown={(e) => {
        // Klik DI DALAM kotak: langsung geser tanpa melompat.
        // Klik DI LUAR kotak: pusatkan crop di titik itu lalu geser.
        const el = e.currentTarget as HTMLElement;
        const r = el.getBoundingClientRect();
        const fx = (e.clientX - r.left - ox) / dw;
        const fy = (e.clientY - r.top - oy) / dh;
        const inside =
          fx >= crop.x &&
          fx <= crop.x + crop.w &&
          fy >= crop.y &&
          fy <= crop.y + crop.h;
        const orig = inside
          ? crop
          : clampCrop({
              ...crop,
              x: fx - crop.w / 2,
              y: fy - crop.h / 2,
            });
        if (!inside) onCropLive(orig);
        beginCropGesture(e, { mode: "move", sx: fx, sy: fy, orig });
      }}
      onPointerMove={onCropMove}
      onPointerUp={endCropGesture}
      onPointerCancel={endCropGesture}
      role="application"
      aria-label="Editor crop: seret untuk memilih area gambar"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt=""
        aria-hidden
        draggable={false}
        style={{
          left: ox,
          top: oy,
          width: dw,
          height: dh,
          filter: "brightness(0.45)",
        }}
        className="pointer-events-none absolute"
      />
      <div
        aria-hidden
        className="absolute border-2 border-white"
        style={{
          left: rx,
          top: ry,
          width: rw,
          height: rh,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
        }}
      >
        <div className="absolute inset-y-0 left-1/3 w-px bg-white/50" />
        <div className="absolute inset-y-0 left-2/3 w-px bg-white/50" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-white/50" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-white/50" />
      </div>
      {(
        [
          { cfx: 0, cfy: 0, cursor: "cursor-nwse-resize" },
          { cfx: 1, cfy: 0, cursor: "cursor-nesw-resize" },
          { cfx: 0, cfy: 1, cursor: "cursor-nesw-resize" },
          { cfx: 1, cfy: 1, cursor: "cursor-nwse-resize" },
          { cfx: 0.5, cfy: 0, cursor: "cursor-ns-resize" },
          { cfx: 0.5, cfy: 1, cursor: "cursor-ns-resize" },
          { cfx: 0, cfy: 0.5, cursor: "cursor-ew-resize" },
          { cfx: 1, cfy: 0.5, cursor: "cursor-ew-resize" },
        ] as const
      ).map((h) => (
        <div
          key={`${h.cfx}-${h.cfy}`}
          onPointerDown={(e) => {
            // Jangan biarkan menggelembung ke surface (akan menimpa
            // gesture resize dengan gesture geser).
            e.stopPropagation();
            beginCropGesture(e, {
              mode: "resize",
              cfx: h.cfx,
              cfy: h.cfy,
              anchor: {
                x: crop.x + (1 - h.cfx) * crop.w,
                y: crop.y + (1 - h.cfy) * crop.h,
              },
            });
          }}
          onPointerMove={onCropMove}
          onPointerUp={endCropGesture}
          onPointerCancel={endCropGesture}
          title="Seret untuk mengubah area crop"
          className={`absolute h-4 w-4 touch-none rounded-full border-2 border-neutral-900 bg-white shadow ${h.cursor}`}
          style={{
            left: rx + h.cfx * rw,
            top: ry + h.cfy * rh,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}

type ResizeHandleDef = {
  id: string;
  fx: number;
  fy: number;
  freeU: boolean;
  freeV: boolean;
  cursor: string;
};

const RESIZE_HANDLES: ResizeHandleDef[] = [
  { id: "nw", fx: 0, fy: 0, freeU: true, freeV: true, cursor: "cursor-nwse-resize" },
  { id: "ne", fx: 1, fy: 0, freeU: true, freeV: true, cursor: "cursor-nesw-resize" },
  { id: "sw", fx: 0, fy: 1, freeU: true, freeV: true, cursor: "cursor-nesw-resize" },
  { id: "se", fx: 1, fy: 1, freeU: true, freeV: true, cursor: "cursor-nwse-resize" },
  { id: "n", fx: 0.5, fy: 0, freeU: false, freeV: true, cursor: "cursor-ns-resize" },
  { id: "s", fx: 0.5, fy: 1, freeU: false, freeV: true, cursor: "cursor-ns-resize" },
  { id: "w", fx: 0, fy: 0.5, freeU: true, freeV: false, cursor: "cursor-ew-resize" },
  { id: "e", fx: 1, fy: 0.5, freeU: true, freeV: false, cursor: "cursor-ew-resize" },
];

type Gesture =
  | { mode: "drag"; startPX: number; startPY: number; orig: PixelFrame }
  | {
      mode: "resize";
      anchorX: number;
      anchorY: number;
      offU0: number;
      offV0: number;
      w0: number;
      h0: number;
      ux: number;
      uy: number;
      vx: number;
      vy: number;
      freeU: boolean;
      freeV: boolean;
      lock: number | null;
    }
  | {
      mode: "rotate";
      centerX: number;
      centerY: number;
      startAngle: number;
      startRotation: number;
    };

export type TransformBoxProps = {
  overlay: Overlay;
  image: HTMLImageElement | null;
  /** Frame Belum diputar dalam piksel halaman. */
  frame: PixelFrame;
  pageWidth: number;
  pageHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  selected: boolean;
  /** Hanya primer (terakhir dipilih) yang menampilkan gagang + bar. */
  showBar: boolean;
  /** Mode crop inline aktif untuk box ini. */
  cropping: boolean;
  onToggleCrop: () => void;
  onCropLive: (crop: CropRect) => void;
  /** Rasio alami gambar (kunci aspek) atau null untuk bebas. */
  aspectLock: number | null;
  onSelect: (additive: boolean) => void;
  onNarrow: () => void;
  onLiveFrame: (frame: PixelFrame) => void;
  onCommitFrame: (frame: PixelFrame) => void;
  onRotateLive: (rotation: number) => void;
  onReset: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onCrop: (() => void) | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Pengganti react-rnd: box seleksi yang benar-benar ikut miring.
 * Semua gestur memakai Pointer Events + capture sehingga mouse & touch
 * ditangani satu jalur. Frame yang disimpan tetap (x, y, w, h) Belum
 * diputar + sudut — sama persis dengan model data lama.
 */
export default function TransformBox({
  overlay,
  image,
  frame,
  pageWidth,
  pageHeight,
  containerRef,
  selected,
  showBar,
  aspectLock,
  onSelect,
  onNarrow,
  onLiveFrame,
  onCommitFrame,
  onRotateLive,
  onReset,
  onDuplicate,
  onToggleLock,
  onToggleVisibility,
  onDelete,
  onCrop,
  cropping,
  onToggleCrop,
  onCropLive,
}: TransformBoxProps) {
  const cropMode =
    cropping && overlay.type === "image" && !!image && !overlay.locked;
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;
  const gestureRef = useRef<Gesture | null>(null);
  const lastFrameRef = useRef<PixelFrame | null>(null);
  const downInfoRef = useRef<{
    x: number;
    y: number;
    wasSelected: boolean;
    shift: boolean;
  } | null>(null);

  const rotation = normalizeRotation(overlay.rotation);
  const { x, y, width, height } = frame;

  const rendered = useMemo(() => {
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    const { canvas, dx, dy } = renderOverlayToCanvas(overlay, w, h, image);
    return {
      url: canvas.toDataURL("image/png"),
      left: x + dx / dpr,
      top: y + dy / dpr,
      width: canvas.width / dpr,
      height: canvas.height / dpr,
    };
  }, [overlay, image, x, y, width, height, dpr]);

  useEffect(
    () => () => {
      gestureRef.current = null;
      lastFrameRef.current = null;
    },
    [],
  );

  const toPagePoint = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const clampFrame = (f: PixelFrame): PixelFrame => {
    const width = clamp(f.width, MIN_SIZE, pageWidth);
    const height = clamp(f.height, MIN_SIZE, pageHeight);
    return {
      x: clamp(f.x, 0, Math.max(0, pageWidth - width)),
      y: clamp(f.y, 0, Math.max(0, pageHeight - height)),
      width,
      height,
    };
  };

  const liveFrame = (f: PixelFrame) => {
    const clamped = clampFrame(f);
    lastFrameRef.current = clamped;
    onLiveFrame(clamped);
  };

  const endGesture = (commit: boolean) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (commit && g && (g.mode === "drag" || g.mode === "resize")) {
      onCommitFrame(lastFrameRef.current ?? { x, y, width, height });
    }
    lastFrameRef.current = null;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g || e.pointerId !== activePointerRef.current) return;
    if (g.mode === "drag") {
      const p = toPagePoint(e.clientX, e.clientY);
      if (!p) return;
      liveFrame({
        x: g.orig.x + (p.x - g.startPX),
        y: g.orig.y + (p.y - g.startPY),
        width: g.orig.width,
        height: g.orig.height,
      });
      return;
    }
    if (g.mode === "resize") {
      const p = toPagePoint(e.clientX, e.clientY);
      if (!p) return;
      const a = (p.x - g.anchorX) * g.ux + (p.y - g.anchorY) * g.uy;
      const b = (p.x - g.anchorX) * g.vx + (p.y - g.anchorY) * g.vy;
      let newW = g.freeU ? Math.abs(a) : g.w0;
      let newH = g.freeV ? Math.abs(b) : g.h0;
      if (g.lock !== null) {
        if (g.freeU) {
          newW = Math.max(newW, MIN_SIZE);
          newH = newW / g.lock;
        } else if (g.freeV) {
          newH = Math.max(newH, MIN_SIZE);
          newW = newH * g.lock;
        }
      }
      const ou = g.freeU ? Math.min(0, a) : g.offU0;
      const ov = g.freeV ? Math.min(0, b) : g.offV0;
      liveFrame({
        x: g.anchorX + g.ux * ou + g.vx * ov,
        y: g.anchorY + g.uy * ou + g.vy * ov,
        width: newW,
        height: newH,
      });
      return;
    }
    // rotate
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + g.centerX;
    const cy = rect.top + g.centerY;
    const ang = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    let delta = ang - g.startAngle;
    if (e.shiftKey) delta = Math.round(delta / 15) * 15;
    onRotateLive(normalizeRotation(g.startRotation + delta));
  };

  const activePointerRef = useRef<number | null>(null);

  const beginGesture = (
    e: React.PointerEvent,
    gesture: Gesture,
    additive: boolean,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    // CATATAN: jangan panggil onSelect di sini bila pemanggil sudah
    // melakukannya — resolveSelection toggle berbasis ref sinkron,
    // dua panggilan dalam satu tick saling membatalkan (bug multi-select).
    // Setiap starter (drag/resize/rotate) memanggil onSelect sendiri.
    downInfoRef.current = {
      x: e.clientX,
      y: e.clientY,
      wasSelected: selected,
      shift: additive,
    };
    gestureRef.current = gesture;
    lastFrameRef.current = null;
    activePointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const info = downInfoRef.current;
    downInfoRef.current = null;
    const moved = info
      ? Math.hypot(e.clientX - info.x, e.clientY - info.y) >= 4
      : true;
    // Klik tanpa geser pada anggota set: sempitkan seleksi ke overlay ini.
    if (info && info.wasSelected && !info.shift && !moved) onNarrow();
    finishGesture(moved);
  };

  const finishGesture = (commit: boolean) => {
    activePointerRef.current = null;
    endGesture(commit);
  };

  const modifierDown = (e: React.PointerEvent) =>
    e.shiftKey || e.ctrlKey || e.metaKey;

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 || overlay.locked) return;
    const p = toPagePoint(e.clientX, e.clientY);
    if (!p) return;
    beginGesture(e, {
      mode: "drag",
      startPX: p.x,
      startPY: p.y,
      orig: { x, y, width, height },
    }, modifierDown(e));
  };

  const startResize = (e: React.PointerEvent, handle: ResizeHandleDef) => {
    if (e.button !== 0 || overlay.locked) return;
    if (!selected) onSelect(modifierDown(e));
    const rad = degToRad(rotation);
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    const vx = -Math.sin(rad);
    const vy = Math.cos(rad);
    const ax = 1 - handle.fx;
    const ay = 1 - handle.fy;
    const additive = modifierDown(e);
    beginGesture(e, {
      mode: "resize",
      anchorX: x + ux * ax * width + vx * ay * height,
      anchorY: y + uy * ax * width + vy * ay * height,
      offU0: -ax * width,
      offV0: -ay * height,
      w0: width,
      h0: height,
      ux,
      uy,
      vx,
      vy,
      freeU: handle.freeU,
      freeV: handle.freeV,
      lock: aspectLock,
    }, additive);
  };

  const startRotate = (e: React.PointerEvent) => {
    if (e.button !== 0 || overlay.locked) return;
    if (!selected) onSelect(modifierDown(e));
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const startAngle =
      (Math.atan2(e.clientY - (rect.top + cy), e.clientX - (rect.left + cx)) * 180) / Math.PI;
    beginGesture(e, {
      mode: "rotate",
      centerX: cx,
      centerY: cy,
      startAngle,
      startRotation: rotation,
    }, modifierDown(e));
  };

  // Geometri seleksi dalam koordinat halaman. lx,ly relatif ke
  // kiri-atas frame; diputar mengelilingi titik tengah box.
  const rad = degToRad(rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const overlayTypeName =
    overlay.type === "text"
      ? "teks"
      : overlay.type === "shape"
        ? "bentuk"
        : "gambar";
  const rotPt = (lx: number, ly: number) => {
    const dx = lx - width / 2;
    const dy = ly - height / 2;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  };

  const bb = rotatedBBox(width, height, rotation);
  const bboxTop = cy - bb.height / 2;
  const bboxBottom = cy + bb.height / 2;
  // Bar di atas bbox; bila mepet tepi atas halaman, pindah ke bawah bbox.
  const placeBelow = bboxTop < 52;
  const barLeft = Math.min(Math.max(cx, 120), Math.max(120, pageWidth - 120));
  const barStyle: React.CSSProperties = placeBelow
    ? { left: barLeft, top: bboxBottom + 8, transform: "translateX(-50%)" }
    : { left: barLeft, top: bboxTop - 44, transform: "translateX(-50%)" };

  // Crop inline: gantikan seluruh tampilan box dengan editor crop
  // (permukaan axis-aligned selebar frame; crop tak bergantung rotasi).
  const showCropEditor = cropMode && image;
  const boxAspect = height > 0 ? width / height : 1;
  const cropAspectImg =
    image && (image.naturalWidth || image.width) > 0
      ? (image.naturalHeight || image.height) /
        Math.max(1, image.naturalWidth || image.width)
      : 1;
  const activeCrop: CropRect =
    overlay.crop ?? defaultFullCrop(boxAspect, cropAspectImg);

  // Zoom area crop terhadap titik tengahnya (faktor >1 = area menyempit).
  const zoomCrop = (factor: number) => {
    const ratio = boxAspect * cropAspectImg;
    let nw = activeCrop.w * factor;
    let nh = nw / ratio;
    if (nh > 1) {
      nh = 1;
      nw = nh * ratio;
    }
    nw = Math.min(1, Math.max(MIN_CROP, nw));
    nh = Math.min(1, Math.max(MIN_CROP, nh));
    const cxp = activeCrop.x + activeCrop.w / 2;
    const cyp = activeCrop.y + activeCrop.h / 2;
    onCropLive({
      x: Math.min(1 - nw, Math.max(0, cxp - nw / 2)),
      y: Math.min(1 - nh, Math.max(0, cyp - nh / 2)),
      w: nw,
      h: nh,
    });
  };

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${selected ? "z-20" : "z-10"}`}
    >
      {showCropEditor && image ? (
        <>
          <div
            className="absolute pointer-events-auto"
            style={{ left: x, top: y, width, height }}
          >
            <CropEditor
              image={image}
              width={width}
              height={height}
              crop={activeCrop}
              onCropLive={onCropLive}
            />
          </div>
          <div
            className="absolute z-20 pointer-events-auto"
            style={barStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              role="toolbar"
              aria-label="Aksi crop gambar"
              className="animate-fade-in flex items-center gap-1.5 rounded-full border border-neutral-700 bg-black/85 p-1 pl-3 shadow-lg backdrop-blur"
            >
              <span className="text-xs font-medium text-neutral-300">
                Potong gambar
              </span>
              <div
                role="group"
                aria-label="Zoom area crop"
                className="flex items-center gap-0.5"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => zoomCrop(1.25)}
                  aria-label="Perkecil area crop (zoom masuk)"
                  title="Perkecil area (zoom masuk)"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold leading-none text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
                >
                  −
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => zoomCrop(0.8)}
                  aria-label="Perbesar area crop (zoom keluar)"
                  title="Perbesar area (zoom keluar)"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold leading-none text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() =>
                  onCropLive(defaultFullCrop(boxAspect, cropAspectImg))
                }
                title="Kembali ke gambar penuh"
                className="rounded-full border border-neutral-700 px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
              >
                Reset
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={onToggleCrop}
                aria-label="Selesai crop"
                title="Selesai (Esc)"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-neutral-300"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : (
      <>
      {/* Lapisan konten (sudah termasuk rotasi bake di pikselnya).
          Bila disembunyikan: tampilkan placeholder garis agar user tahu
          overlay masih ada (tidak terhapus) dan bisa dipilih. */}
      {overlay.visible === false ? (
        <div
          className="absolute touch-none select-none pointer-events-auto"
          style={{ left: x, top: y, width, height }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onSelect(e.shiftKey || e.ctrlKey || e.metaKey);
          }}
          role="button"
          aria-label={`Overlay ${overlayTypeName} disembunyikan, klik untuk memilih`}
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 border border-dashed border-neutral-600 bg-black/20">
            <svg
              className="h-4 w-4 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
              />
            </svg>
            <span className="px-1 text-center text-[10px] font-medium text-neutral-400">
              Disembunyikan
            </span>
          </div>
        </div>
      ) : (
      <div
        className={`absolute touch-none select-none pointer-events-auto ${overlay.locked ? "" : "cursor-move"}`}
        style={{
          left: rendered.left,
          top: rendered.top,
          width: rendered.width,
          height: rendered.height,
        }}
        onPointerDown={(e) => {
          // Abaikan event dari kontrol interaktif (tombol context bar):
          // tanpa ini, pointerDown menggelembung ke sini, drag dimulai +
          // pointer-capture dialihkan ke lapisan konten sehingga `click`
          // tak pernah sampai ke tombol (tools mati total).
          if (
            (e.target as HTMLElement).closest(
              "button, a, input, textarea, select",
            )
          ) {
            return;
          }
          // Selalu telan event di sini: tanpa preventDefault, compatibility
          // mousedown akan menggelembung ke kontainer dan langsung
          // membatalkan seleksi (terlihat pada overlay terkunci).
          e.stopPropagation();
          e.preventDefault();
          // Sudah anggota set: biarkan utuh agar drag memindahkan semuanya.
          // Penyempitan ke satu terjadi di pointerup bila tanpa geser.
          if (!selected) {
            onSelect(e.shiftKey || e.ctrlKey || e.metaKey);
          }
          startDrag(e);
        }}
        onPointerMove={onPointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            downInfoRef.current = null;
            finishGesture(false);
          }}
        role="button"
        aria-label={
          overlay.locked
            ? `Overlay ${overlayTypeName} terkunci`
            : `Overlay ${overlayTypeName}, seret untuk memindahkan`
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rendered.url}
          alt=""
          aria-hidden
          draggable={false}
          style={{ width: rendered.width, height: rendered.height }}
          className="pointer-events-none"
        />
      </div>
      )}
      </>)}
      {selected && !showCropEditor && (
        <>
          {/* Outline seleksi mengikuti sudut box (abu bila terkunci).
              Disembunyikan bila overlay hidden — placeholder sudah cukup. */}
          {overlay.visible !== false && (
          <div
            aria-hidden
            className={`pointer-events-none absolute border-2 border-dashed ${
              overlay.locked ? "border-neutral-500" : "border-amber-400"
            }`}
            style={{
              left: x,
              top: y,
              width,
              height,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center",
            }}
          />
          )}
          {showBar && !overlay.locked && overlay.visible !== false && (
            <>
              {/* Gagang resize di 8 titik sudut/sisi terotasi */}
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {RESIZE_HANDLES.map((h) => {
                  const p = rotPt(h.fx * width, h.fy * height);
                  return (
                    <div
                      key={h.id}
                      onPointerDown={(e) => startResize(e, h)}
                      onPointerMove={onPointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={() => finishGesture(false)}
                      title="Seret untuk mengubah ukuran"
                      className={`pointer-events-auto absolute h-3.5 w-3.5 touch-none rounded-full border-2 border-neutral-900 bg-white shadow ${h.cursor}`}
                      style={{
                        left: p.x,
                        top: p.y,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  );
                })}
              </div>
              {/* Gagang putar di atas tepi atas box */}
              <div
                aria-hidden={false}
                className="pointer-events-none absolute inset-0"
              >
                {(() => {
                  const top = rotPt(width / 2, 0);
                  const dirx = -Math.sin(rad);
                  const diry = -Math.cos(rad);
                  const kx = top.x + dirx * 30;
                  const ky = top.y + diry * 30;
                  return (
                    <div
                      className="pointer-events-none absolute flex flex-col items-center"
                      style={{
                        left: kx,
                        top: ky,
                        transform: "translate(-50%, -100%)",
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Seret untuk memutar overlay (tahan Shift untuk snap 15 derajat)"
                        title="Seret untuk memutar (Shift = snap 15°)"
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={startRotate}
                        onPointerMove={onPointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={() => finishGesture(false)}
                        className="pointer-events-auto flex h-5 w-5 touch-none cursor-grab items-center justify-center rounded-full border border-neutral-400 bg-black shadow-lg transition-colors hover:border-white active:cursor-grabbing"
                      >
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full bg-neutral-300"
                        />
                      </button>
                      <div aria-hidden className="h-[9px] w-px bg-neutral-500" />
                    </div>
                  );
                })()}
              </div>
            </>
          )}
          {/* Context bar melayang di atas/bawah bbox — hanya primer.
              pointer-events-auto wajib: induk overlay memakai
              pointer-events-none (diwariskan), tanpanya seluruh tombol
              tak pernah menerima event dan klik tembus ke lapisan konten. */}
          {showBar && (
          <div
            className="absolute z-20 pointer-events-auto"
            style={barStyle}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <OverlayContextBar
              overlay={overlay}
              onReset={onReset}
              onDuplicate={onDuplicate}
              onToggleLock={onToggleLock}
              onToggleVisibility={onToggleVisibility}
              onDelete={onDelete}
              onCrop={onCrop}
            />
          </div>
          )}
        </>
      )}
    </div>
  );
}
