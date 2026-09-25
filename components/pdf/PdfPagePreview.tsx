"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  onReset: (id: string) => void;
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

  // Konfirmasi hapus 2-klik di context bar: klik pertama arm (tombol
  // memerah), klik kedua eksekusi. Timeout 3 detik membatalkan otomatis.
  const [armedId, setArmedId] = useState<string | null>(null);
  const armTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (armTimerRef.current) window.clearTimeout(armTimerRef.current);
    },
    [],
  );

  const disarmDelete = () => {
    if (armTimerRef.current) {
      window.clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
    setArmedId(null);
  };

  const handleBarDelete = (id: string) => {
    if (armedId === id) {
      disarmDelete();
      onDelete(id);
    } else {
      if (armTimerRef.current) window.clearTimeout(armTimerRef.current);
      setArmedId(id);
      armTimerRef.current = window.setTimeout(() => {
        armTimerRef.current = null;
        setArmedId(null);
      }, 3000);
    }
  };

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
            enableResizing={isSelected && !overlay.locked}
            disableDragging={!!overlay.locked}
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
              overlay.locked
                ? `Overlay ${overlay.type === "text" ? "teks" : "gambar"} terkunci`
                : overlay.type === "text"
                  ? "Overlay teks, dapat dipindahkan"
                  : "Overlay gambar, dapat dipindahkan"
            }
            resizeHandleClasses={{ bottomRight: "opacity-100" }}
          >
            <div
              className={`flex h-full w-full items-center justify-center ${
                isSelected
                  ? "border-2 border-dashed border-amber-400"
                  : "hover:outline hover:outline-2 hover:outline-amber-400/70"
              }`}
            >
              <OverlayRenderer
                overlay={overlay}
                width={width}
                height={height}
                image={images[overlay.id] ?? null}
              />
              {isSelected && (
                <div
                  role="toolbar"
                  aria-label="Aksi cepat overlay terpilih"
                  className="absolute top-1 left-1/2 z-20 flex max-w-[calc(100%-8px)] -translate-x-1/2 items-center gap-0.5 overflow-hidden rounded-full border border-neutral-700 bg-black/85 py-0.5 pl-0.5 pr-0.5 shadow-lg backdrop-blur"
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => onReset(overlay.id)}
                    aria-label="Reset tampilan overlay"
                    title="Reset tampilan (posisi, ukuran, rotasi & transparansi)"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-neutral-700 hover:text-white"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => handleBarDelete(overlay.id)}
                    aria-label={
                      armedId === overlay.id
                        ? "Klik sekali lagi untuk menghapus overlay"
                        : "Hapus overlay"
                    }
                    title={
                      armedId === overlay.id
                        ? "Klik sekali lagi untuk menghapus"
                        : "Hapus overlay (bisa diurungkan)"
                    }
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                      armedId === overlay.id
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "text-neutral-300 hover:bg-neutral-700 hover:text-white"
                    }`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </Rnd>
        );
        })}
    </div>
  );
}
