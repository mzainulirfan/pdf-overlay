"use client";

import type { Overlay } from "@/types/overlay";

type OverlayListProps = {
  overlays: Overlay[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
};

export function overlayLabel(overlay: Overlay, index: number): string {
  if (overlay.type === "text") {
    const firstLine = (overlay.text ?? "").split("\n")[0].trim();
    return firstLine || `Teks ${index + 1}`;
  }
  return `Gambar ${index + 1}`;
}

export default function OverlayList({
  overlays,
  selectedId,
  onSelect,
  onDelete,
  onToggleVisibility,
}: OverlayListProps) {
  if (overlays.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-slate-400">
        Daftar overlay ({overlays.length})
      </h3>
      <ul className="flex flex-col gap-1.5" aria-label="Daftar overlay">
        {overlays.map((overlay, index) => {
          const isSelected = overlay.id === selectedId;
          const isVisible = overlay.visible !== false;
          const label = overlayLabel(overlay, index);
          return (
            <li key={overlay.id} className="flex items-stretch gap-1.5">
              <button
                type="button"
                onClick={() => onSelect(overlay.id)}
                aria-pressed={isSelected}
                title={`Pilih overlay ${label}`}
                className={`flex min-w-0 flex-1 items-center gap-2 truncate rounded-lg border px-2.5 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/15 font-medium text-indigo-200"
                    : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                } ${isVisible ? "" : "opacity-60"}`}
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                    overlay.type === "text"
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  {overlay.type === "text" ? "T" : "G"}
                </span>
                <span className="truncate">
                  {index + 1}. {label}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onToggleVisibility(overlay.id)}
                aria-pressed={isVisible}
                aria-label={
                  isVisible
                    ? `Sembunyikan overlay ${label}`
                    : `Tampilkan overlay ${label}`
                }
                title={isVisible ? "Sembunyikan" : "Tampilkan"}
                className={`shrink-0 rounded-lg border px-2 transition-colors ${
                  isVisible
                    ? "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    : "border-indigo-500/50 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20"
                }`}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  {isVisible ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.05 12.55a1 1 0 0 1 0-.1 11.36 11.36 0 0 1 19.9 0 1 1 0 0 1 0 .1 11.36 11.36 0 0 1-19.9 0zm9.95 3.45a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 3l18 18M10.58 10.58a4 4 0 0 0 5.66 5.66M9.88 5.34A11.4 11.4 0 0 1 12 5c3.73 0 7.02 2.07 9.05 5.05a1 1 0 0 1 0 .1 11.4 11.4 0 0 1-3.06 3.3M6.06 6.06A11.36 11.36 0 0 0 2.05 12.45a1 1 0 0 0 0 .1c.65.97 1.44 1.86 2.35 2.63"
                    />
                  )}
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onDelete(overlay.id)}
                aria-label={`Hapus overlay ${label}`}
                className="shrink-0 rounded-lg border border-slate-700 px-2 text-slate-500 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
