"use client";

import { useEffect, useMemo, useRef } from "react";
import { Rnd } from "react-rnd";
import type { Overlay } from "@/types/overlay";
import { ratiosFromPixel } from "@/lib/coordinate-converter";
import OverlayRenderer from "@/components/overlay/OverlayRenderer";

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
}: PdfPagePreviewProps) {
  // Mahal untuk PDF besar — hitung sekali per objek canvas, bukan tiap render.
  const pageImageUrl = useMemo(
    () => (canvas ? canvas.toDataURL("image/png") : null),
    [canvas],
  );

  // Update live selama drag/resize, di-throttle via rAF agar maksimal
  // satu setState per frame. Tanpa ini ukuran/teks baru di-commit saat
  // lepas (onDragStop/onResizeStop) sehingga terlihat "melompat".
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

  return (
    <div
      style={{ width: pageWidth, height: pageHeight }}
      onMouseDown={() => onSelect(null)}
      className="relative select-none overflow-hidden bg-white shadow-xl shadow-black/40 ring-1 ring-slate-800"
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
        const isSelected = overlay.id === selectedId;
        const width = overlay.widthRatio * pageWidth;
        const height = overlay.heightRatio * pageHeight;
        const x = overlay.xRatio * pageWidth;
        const y = overlay.yRatio * pageHeight;
        // Kunci rasio aspek agar teks/gambar tetap proporsional saat di-resize.
        // Gambar memakai rasio alami file (menghilangkan dead space letterbox),
        // teks memakai rasio box saat ini.
        const naturalImage = images[overlay.id];
        const aspectLock =
          overlay.type === "image" &&
          naturalImage &&
          naturalImage.width > 0 &&
          naturalImage.height > 0
            ? naturalImage.width / naturalImage.height
            : true;

        return (
          <Rnd
            key={overlay.id}
            size={{ width, height }}
            position={{ x, y }}
            bounds="parent"
            enableResizing={isSelected}
            disableDragging={false}
            lockAspectRatio={aspectLock}
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelect(overlay.id);
            }}
            onDragStart={() => onSelect(overlay.id)}
            onDrag={(_e, d) => {
              scheduleLiveChange(
                overlay.id,
                ratiosFromPixel(d.x, d.y, width, height, pageWidth, pageHeight),
              );
            }}
            onDragStop={(_e, d) => {
              commitLiveChange(
                overlay.id,
                ratiosFromPixel(d.x, d.y, width, height, pageWidth, pageHeight),
              );
            }}
            onResize={(_e, _dir, ref, _delta, position) => {
              scheduleLiveChange(
                overlay.id,
                ratiosFromPixel(
                  position.x,
                  position.y,
                  ref.offsetWidth,
                  ref.offsetHeight,
                  pageWidth,
                  pageHeight,
                ),
              );
            }}
            onResizeStop={(_e, _dir, ref, _delta, position) => {
              commitLiveChange(
                overlay.id,
                ratiosFromPixel(
                  position.x,
                  position.y,
                  ref.offsetWidth,
                  ref.offsetHeight,
                  pageWidth,
                  pageHeight,
                ),
              );
            }}
            className="z-10"
            aria-label={
              overlay.type === "text" ? "Overlay teks, dapat dipindahkan" : "Overlay gambar, dapat dipindahkan"
            }
            resizeHandleClasses={{ bottomRight: "opacity-100" }}
          >
            <div
              className={`flex h-full w-full items-center justify-center ${
                isSelected
                  ? "border-2 border-dashed border-indigo-500"
                  : "hover:outline hover:outline-2 hover:outline-indigo-300"
              }`}
            >
              <OverlayRenderer
                overlay={overlay}
                width={width}
                height={height}
                image={images[overlay.id] ?? null}
              />
              {isSelected && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onDelete(overlay.id)}
                  aria-label="Hapus overlay"
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-red-700"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </Rnd>
        );
        })}
    </div>
  );
}
