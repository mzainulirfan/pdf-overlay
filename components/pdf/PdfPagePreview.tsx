"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Overlay } from "@/types/overlay";
import { ratiosFromPixel } from "@/lib/coordinate-converter";
import TransformBox, { type PixelFrame } from "@/components/pdf/TransformBox";

type PdfPagePreviewProps = {
  pageWidth: number;
  pageHeight: number;
  canvas?: HTMLCanvasElement | null;
  overlays: Overlay[];
  images: Record<string, HTMLImageElement | null>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Overlay>) => void;
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleVisibility: (id: string) => void;
};

export default function PdfPagePreview({
  pageWidth,
  pageHeight,
  canvas,
  overlays,
  images,
  selectedId,
  onSelect,
  onChange,
  onDelete,
  onReset,
  onDuplicate,
  onToggleLock,
  onToggleVisibility,
}: PdfPagePreviewProps) {
  // Mahal untuk PDF besar — hitung sekali per objek canvas, bukan tiap render.
  const pageImageUrl = useMemo(
    () => (canvas ? canvas.toDataURL("image/png") : null),
    [canvas],
  );

  // Update live selama drag/resize, di-throttle via rAF agar maksimal
  // satu setState per frame. Tanpa ini ukuran/teks baru di-commit saat
  // lepas sehingga terlihat "melompat".
  const liveFrameRef = useRef(0);
  const livePatchRef = useRef<{
    id: string;
    patch: Partial<Overlay>;
  } | null>(null);

  useEffect(
    () => () => {
      if (liveFrameRef.current) cancelAnimationFrame(liveFrameRef.current);
    },
    [],
  );

  const scheduleLiveChange = (id: string, patch: Partial<Overlay>) => {
    livePatchRef.current = { id, patch };
    if (liveFrameRef.current) return;
    liveFrameRef.current = requestAnimationFrame(() => {
      liveFrameRef.current = 0;
      const pending = livePatchRef.current;
      livePatchRef.current = null;
      if (pending) onChange(pending.id, pending.patch);
    });
  };

  const commitLiveChange = (id: string, patch: Partial<Overlay>) => {
    if (liveFrameRef.current) {
      cancelAnimationFrame(liveFrameRef.current);
      liveFrameRef.current = 0;
    }
    livePatchRef.current = null;
    onChange(id, patch);
  };

  const pageRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={pageRef}
      style={{ width: pageWidth, height: pageHeight }}
      onMouseDown={() => onSelect(null)}
      className="relative select-none overflow-hidden bg-white shadow-xl shadow-black/40 ring-1 ring-neutral-800"
    >
      {pageImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pageImageUrl}
          alt="Pratinjau halaman PDF"
          style={{ width: pageWidth, height: pageHeight }}
          className="pointer-events-none absolute inset-0"
          draggable={false}
        />
      )}

      {overlays
        .filter((overlay) => overlay.visible !== false)
        .map((overlay) => {
          const width = overlay.widthRatio * pageWidth;
          const height = overlay.heightRatio * pageHeight;
          // Gambar dikunci ke rasio alami file agar tetap proporsional
          // (sekaligus menghilangkan dead space letterbox); teks bebas
          // agar jumlah baris wrap menyesuaikan bentuk box.
          const naturalImage = images[overlay.id];
          const aspectLock =
            overlay.type === "image" &&
            naturalImage &&
            naturalImage.width > 0 &&
            naturalImage.height > 0
              ? naturalImage.width / naturalImage.height
              : null;

          const toRatios = (frame: PixelFrame) =>
            ratiosFromPixel(
              frame.x,
              frame.y,
              frame.width,
              frame.height,
              pageWidth,
              pageHeight,
            );

          return (
            <TransformBox
              key={overlay.id}
              overlay={overlay}
              image={naturalImage ?? null}
              frame={{
                x: overlay.xRatio * pageWidth,
                y: overlay.yRatio * pageHeight,
                width,
                height,
              }}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              containerRef={pageRef}
              selected={overlay.id === selectedId}
              aspectLock={aspectLock}
              onSelect={() => onSelect(overlay.id)}
              onLiveFrame={(frame) =>
                scheduleLiveChange(overlay.id, toRatios(frame))
              }
              onCommitFrame={(frame) =>
                commitLiveChange(overlay.id, toRatios(frame))
              }
              onRotateLive={(rotation) =>
                onChange(overlay.id, { rotation })
              }
              onReset={() => onReset(overlay.id)}
              onDuplicate={() => onDuplicate(overlay.id)}
              onToggleLock={() => onToggleLock(overlay.id)}
              onToggleVisibility={() => onToggleVisibility(overlay.id)}
              onDelete={() => onDelete(overlay.id)}
            />
          );
        })}
    </div>
  );
}
