"use client";

import type { Overlay, Rotation } from "@/types/overlay";

type OverlayPropertiesProps = {
  overlay: Overlay;
  onChange: (patch: Partial<Overlay>) => void;
  onDelete: () => void;
  onReset: () => void;
};

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

export default function OverlayProperties({
  overlay,
  onChange,
  onDelete,
  onReset,
}: OverlayPropertiesProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Properti Overlay</h2>
          <p className="mt-1 text-xs text-slate-500">
            {overlay.type === "text" ? "Overlay teks" : "Overlay gambar"} ·
            berlaku ke semua halaman
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
          {overlay.type === "text" ? "Teks" : "Gambar"}
        </span>
      </div>

      {overlay.type === "text" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-600">Isi teks</span>
          <textarea
            value={overlay.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            rows={3}
            placeholder="Tulis teks, Enter untuk baris baru"
            className={`${input} resize-none leading-relaxed`}
          />
        </label>
      )}

      {overlay.type === "image" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Geser untuk memindah. Gunakan gagang sudut untuk mengubah ukuran
          sambil menjaga posisi.
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between text-xs font-medium text-slate-600">
          <span>Transparansi</span>
          <span className="font-semibold tabular-nums text-indigo-600">
            {Math.round(overlay.opacity * 100)}%
          </span>
        </span>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(overlay.opacity * 100)}
          onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
          className="w-full accent-indigo-600"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-slate-600">Rotasi</span>
        <div className="grid grid-cols-4 gap-2">
          {ROTATIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ rotation: r })}
              className={`rounded-lg border py-2 text-sm font-medium transition-all ${
                overlay.rotation === r
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {r}°
            </button>
          ))}
        </div>
      </label>

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Reset Posisi
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Hapus Overlay
        </button>
      </div>
    </div>
  );
}