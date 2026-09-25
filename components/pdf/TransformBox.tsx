"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Overlay } from "@/types/overlay";
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
}: {
  label: string;
  title: string;
  pressed?: boolean;
  disabled?: boolean;
  solid?: boolean;
  onPress: () => void;
  path: string;
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
      {solid ? (
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
      )}
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
};

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
      className={`flex items-center gap-0.5 overflow-hidden rounded-full border bg-black/85 p-0.5 shadow-lg backdrop-blur ${
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
  /** Rasio alami gambar (kunci aspek) atau null untuk bebas. */
  aspectLock: number | null;
  onSelect: () => void;
  onLiveFrame: (frame: PixelFrame) => void;
  onCommitFrame: (frame: PixelFrame) => void;
  onRotateLive: (rotation: number) => void;
  onReset: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
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
  aspectLock,
  onSelect,
  onLiveFrame,
  onCommitFrame,
  onRotateLive,
  onReset,
  onDuplicate,
  onToggleLock,
  onToggleVisibility,
  onDelete,
}: TransformBoxProps) {
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 3) : 1;
  const gestureRef = useRef<Gesture | null>(null);
  const lastFrameRef = useRef<PixelFrame | null>(null);

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
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    gestureRef.current = gesture;
    lastFrameRef.current = null;
    activePointerRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const finishGesture = (commit: boolean) => {
    activePointerRef.current = null;
    endGesture(commit);
  };

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 || overlay.locked) return;
    const p = toPagePoint(e.clientX, e.clientY);
    if (!p) return;
    beginGesture(e, {
      mode: "drag",
      startPX: p.x,
      startPY: p.y,
      orig: { x, y, width, height },
    });
  };

  const startResize = (e: React.PointerEvent, handle: ResizeHandleDef) => {
    if (e.button !== 0 || overlay.locked) return;
    const rad = degToRad(rotation);
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    const vx = -Math.sin(rad);
    const vy = Math.cos(rad);
    const ax = 1 - handle.fx;
    const ay = 1 - handle.fy;
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
    });
  };

  const startRotate = (e: React.PointerEvent) => {
    if (e.button !== 0 || overlay.locked) return;
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
    });
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

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${selected ? "z-20" : "z-10"}`}
    >
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
            onSelect();
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
          onSelect();
          startDrag(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={() => finishGesture(true)}
        onPointerCancel={() => finishGesture(false)}
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

      {selected && (
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
          {!overlay.locked && overlay.visible !== false && (
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
                      onPointerUp={() => finishGesture(true)}
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
                        onPointerUp={() => finishGesture(false)}
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
          {/* Context bar melayang di atas/bawah bbox.
              pointer-events-auto wajib: induk overlay memakai
              pointer-events-none (diwariskan), tanpanya seluruh tombol
              tak pernah menerima event dan klik tembus ke lapisan konten. */}
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
            />
          </div>
        </>
      )}
    </div>
  );
}
