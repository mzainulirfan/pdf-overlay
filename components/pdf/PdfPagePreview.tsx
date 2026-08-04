"use client";

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
  return (
    <div
      style={{ width: pageWidth, height: pageHeight }}
      onMouseDown={() => onSelect(null)}
      className="relative select-none overflow-hidden bg-white shadow-xl shadow-slate-200/60 ring-1 ring-slate-200"
    >
      {canvas && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={canvas.toDataURL("image/png")}
          alt="Pratinjau halaman PDF"
          style={{ width: pageWidth, height: pageHeight }}
          className="pointer-events-none absolute inset-0"
          draggable={false}
        />
      )}

      {overlays.map((overlay) => {
        const isSelected = overlay.id === selectedId;
        const width = overlay.widthRatio * pageWidth;
        const height = overlay.heightRatio * pageHeight;
        const x = overlay.xRatio * pageWidth;
        const y = overlay.yRatio * pageHeight;

        return (
          <Rnd
            key={overlay.id}
            size={{ width, height }}
            position={{ x, y }}
            bounds="parent"
            enableResizing={isSelected}
            disableDragging={!isSelected}
            onMouseDown={(e) => {
              e.stopPropagation();
              onSelect(overlay.id);
            }}
            onDragStart={() => onSelect(overlay.id)}
            onDragStop={(_e, d) => {
              onChange(
                overlay.id,
                ratiosFromPixel(d.x, d.y, width, height, pageWidth, pageHeight),
              );
            }}
            onResizeStop={(_e, _dir, ref, _delta, position) => {
              onChange(
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
                  onClick={() => onDelete(overlay.id)}
                  aria-label="Hapus overlay"
                  className="absolute -top-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition-transform hover:scale-110 hover:bg-red-700"
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
