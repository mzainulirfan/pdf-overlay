"use client";

import type { Overlay, Rotation } from "@/types/overlay";

type OverlayPropertiesProps = {
  overlay: Overlay;
  onChange: (patch: Partial<Overlay>) => void;
  onDelete: () => void;
  onReset: () => void;
  onToggleVisibility: () => void;
};

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

const input =
  "w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-neutral-100 outline-none transition-shadow placeholder:text-neutral-600 focus:border-white focus:ring-2 focus:ring-white/30";

export default function OverlayProperties({
  overlay,
  onChange,
  onDelete,
  onReset,
  onToggleVisibility,
}: OverlayPropertiesProps) {
  const isVisible = overlay.visible !== false;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">Properti Overlay</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {overlay.type === "text" ? "Overlay teks" : "Overlay gambar"} ·
            berlaku ke semua halaman
          </p>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
          {overlay.type === "text" ? "Teks" : "Gambar"}
        </span>
      </div>

      {overlay.type === "text" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-400">Isi teks</span>
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
        <div className="rounded-lg border border-neutral-800 bg-black px-3 py-2 text-xs text-neutral-500">
          Geser untuk memindah. Gunakan gagang sudut untuk mengubah ukuran
          sambil menjaga posisi.
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between text-xs font-medium text-neutral-400">
          <span>Transparansi</span>
          <span className="font-semibold tabular-nums text-white">
            {Math.round(overlay.opacity * 100)}%
          </span>
        </span>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(overlay.opacity * 100)}
          onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
          className="w-full accent-white"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">Rotasi</span>
        <div className="grid grid-cols-4 gap-2">
          {ROTATIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ rotation: r })}
              aria-pressed={overlay.rotation === r}
              aria-label={`Rotasi ${r} derajat`}
              className={`rounded-lg border py-2 text-sm font-medium transition-all ${
                overlay.rotation === r
                  ? "border-white bg-white text-black"
                  : "border-neutral-700 bg-black text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800"
              }`}
            >
              {r}°
            </button>
          ))}
        </div>
      </label>

      <div className="flex flex-col gap-2 border-t border-neutral-800 pt-4">
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-pressed={isVisible}
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          {isVisible ? "Sembunyikan Overlay" : "Tampilkan Overlay"}
        </button>
        <button
          type="button"
          onClick={onReset}
          title="Kembalikan posisi, ukuran, rotasi & transparansi (isi dipertahankan)"
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          Reset Tampilan
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-red-500/30 bg-black px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          Hapus Overlay
        </button>
      </div>
    </div>
  );
}