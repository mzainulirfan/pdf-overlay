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
  selectedIds: Set<string>;
  primaryId: string | null;
  onSelectOverlay: (id: string, additive: boolean) => void;
  onNarrowSelection: (id: string) => void;
  onEmptyClick: () => void;
  getSelection: () => Set<string>;
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
  selectedIds,
  primaryId,
  onSelectOverlay,
  onNarrowSelection,
  onEmptyClick,
  getSelection,
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

  // Update live selama drag, di-throttle via rAF agar maksimal
  // satu setState per frame.
  const liveFrameRef = useRef(0);
  const livePatchesRef = useRef<{ id: string; patch: Partial<Overlay> }[] | null>(
    null,
  );

  useEffect(
    () => () => {
      if (liveFrameRef.current) cancelAnimationFrame(liveFrameRef.current);
    },
    [],
  );

  const scheduleBulkLive = (patches: { id: string; patch: Partial<Overlay> }[]) => {
    livePatchesRef.current = patches;
    if (liveFrameRef.current) return;
    liveFrameRef.current = requestAnimationFrame(() => {
      liveFrameRef.current = 0;
      const pending = livePatchesRef.current;
      livePatchesRef.current = null;
      if (pending) {
        for (const p of pending) onChange(p.id, p.patch);
      }
    });
  };

  const commitBulkLive = (patches: { id: string; patch: Partial<Overlay> }[]) => {
    if (liveFrameRef.current) {
      cancelAnimationFrame(liveFrameRef.current);
      liveFrameRef.current = 0;
    }
    livePatchesRef.current = null;
    for (const p of patches) onChange(p.id, p.patch);
  };

  // Drag memindahkan seluruh set seleksi (bila yang diseret anggotanya),
  // kalau tidak hanya overlay itu sendiri. Yang terkunci tidak ikut.
  const memberIds = (draggedId: string): string[] => {
    const set = getSelection();
    if (!set.has(draggedId) || set.size <= 1) return [draggedId];
    return [...set].filter((id) => {
      const o = overlays.find((x) => x.id === id);
      return o && !o.locked;
    });
  };

  const toRatios = (frame: PixelFrame) =>
    ratiosFromPixel(
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      pageWidth,
      pageHeight,
    );

  // Frame yang diseret (drag/resize) dipakai apa adanya untuk overlay itu
  // sendiri; pengikut lain hanya mewarisi DELTA posisi (ukuran mereka tetap).
  const handleBoxLiveFrame = (dragged: Overlay, frame: PixelFrame) => {
    const ids = memberIds(dragged.id);
    const base = overlays.find((o) => o.id === dragged.id);
    if (!base) return;
    const dx = frame.x - base.xRatio * pageWidth;
    const dy = frame.y - base.yRatio * pageHeight;
    scheduleBulkLive(
      ids.flatMap((id) => {
        if (id === dragged.id) return [{ id, patch: toRatios(frame) }];
        const o = overlays.find((x) => x.id === id);
        if (!o) return [];
        return [
          {
            id,
            patch: ratiosFromPixel(
              o.xRatio * pageWidth + dx,
              o.yRatio * pageHeight + dy,
              o.widthRatio * pageWidth,
              o.heightRatio * pageHeight,
              pageWidth,
              pageHeight,
            ),
          },
        ];
      }),
    );
  };

  const handleBoxCommitFrame = (dragged: Overlay, frame: PixelFrame) => {
    const ids = memberIds(dragged.id);
    const base = overlays.find((o) => o.id === dragged.id);
    if (!base) return;
    const dx = frame.x - base.xRatio * pageWidth;
    const dy = frame.y - base.yRatio * pageHeight;
    commitBulkLive(
      ids.flatMap((id) => {
        if (id === dragged.id) return [{ id, patch: toRatios(frame) }];
        const o = overlays.find((x) => x.id === id);
        if (!o) return [];
        return [
          {
            id,
            patch: ratiosFromPixel(
              o.xRatio * pageWidth + dx,
              o.yRatio * pageHeight + dy,
              o.widthRatio * pageWidth,
              o.heightRatio * pageHeight,
              pageWidth,
              pageHeight,
            ),
          },
        ];
      }),
    );
  };

  const pageRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={pageRef}
      style={{ width: pageWidth, height: pageHeight }}
      onMouseDown={(e) => {
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) onEmptyClick();
      }}
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
        // Yang disembunyikan tetap dirender bila sedang dipilih agar
        // TransformBox bisa menampilkan placeholder + context bar.
        .filter(
          (overlay) =>
            overlay.visible !== false || selectedIds.has(overlay.id),
        )
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
              selected={selectedIds.has(overlay.id)}
              showBar={overlay.id === primaryId}
              aspectLock={aspectLock}
              onSelect={(additive) => onSelectOverlay(overlay.id, additive)}
              onNarrow={() => onNarrowSelection(overlay.id)}
              onLiveFrame={(frame) => handleBoxLiveFrame(overlay, frame)}
              onCommitFrame={(frame) => handleBoxCommitFrame(overlay, frame)}
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
