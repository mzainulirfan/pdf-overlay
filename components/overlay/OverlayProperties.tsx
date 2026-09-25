"use client";

import type { Overlay, Rotation } from "@/types/overlay";

type OverlayPropertiesProps = {
  overlay: Overlay;
  onChange: (patch: Partial<Overlay>) => void;
};

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

type AlignSpot = {
  label: string;
  x: number;
  y: number;
};

/** 9 titik align dalam koordinat rasio (sudut kiri-atas box). */
function alignSpots(overlay: Overlay): AlignSpot[] {
  const maxX = Math.max(0, 1 - overlay.widthRatio);
  const maxY = Math.max(0, 1 - overlay.heightRatio);
  const cx = maxX / 2;
  const cy = maxY / 2;
  return [
    { label: "Kiri atas", x: 0, y: 0 },
    { label: "Tengah atas", x: cx, y: 0 },
    { label: "Kanan atas", x: maxX, y: 0 },
    { label: "Tengah kiri", x: 0, y: cy },
    { label: "Tengah", x: cx, y: cy },
    { label: "Tengah kanan", x: maxX, y: cy },
    { label: "Kiri bawah", x: 0, y: maxY },
    { label: "Tengah bawah", x: cx, y: maxY },
    { label: "Kanan bawah", x: maxX, y: maxY },
  ];
}

function commitPercent(
  raw: string,
  max: number,
  apply: (ratio: number) => void,
) {
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return;
  const clamped = Math.min(max, Math.max(0, parsed));
  apply(clamped / 100);
}

const input =
  "w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-neutral-100 outline-none transition-shadow placeholder:text-neutral-600 focus:border-white focus:ring-2 focus:ring-white/30";

export default function OverlayProperties({
  overlay,
  onChange,
}: OverlayPropertiesProps) {
  const spots = alignSpots(overlay);
  const maxXPct = Math.round(Math.max(0, 1 - overlay.widthRatio) * 100);
  const maxYPct = Math.round(Math.max(0, 1 - overlay.heightRatio) * 100);
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

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">Posisi (%)</span>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-xs font-semibold text-neutral-500">
              X
            </span>
            <input
              key={`${overlay.id}-x`}
              type="number"
              min={0}
              max={maxXPct}
              defaultValue={Math.round(overlay.xRatio * 100)}
              aria-label="Posisi horizontal dalam persen"
              onBlur={(e) =>
                commitPercent(e.target.value, maxXPct, (xRatio) =>
                  onChange({ xRatio }),
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  (e.target as HTMLInputElement).blur();
              }}
              className={`${input} tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="w-4 shrink-0 text-xs font-semibold text-neutral-500">
              Y
            </span>
            <input
              key={`${overlay.id}-y`}
              type="number"
              min={0}
              max={maxYPct}
              defaultValue={Math.round(overlay.yRatio * 100)}
              aria-label="Posisi vertikal dalam persen"
              onBlur={(e) =>
                commitPercent(e.target.value, maxYPct, (yRatio) =>
                  onChange({ yRatio }),
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  (e.target as HTMLInputElement).blur();
              }}
              className={`${input} tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
            />
          </label>
        </div>
        <div
          role="group"
          aria-label="Align cepat"
          className="mt-1 grid grid-cols-3 gap-1"
        >
          {spots.map((spot) => {
            const active =
              Math.abs(overlay.xRatio - spot.x) < 0.01 &&
              Math.abs(overlay.yRatio - spot.y) < 0.01;
            return (
              <button
                key={spot.label}
                type="button"
                onClick={() => onChange({ xRatio: spot.x, yRatio: spot.y })}
                aria-pressed={active}
                title={`Align ${spot.label.toLowerCase()}`}
                aria-label={`Posisikan di ${spot.label.toLowerCase()}`}
                className={`flex h-7 items-center justify-center rounded-md border transition-colors ${
                  active
                    ? "border-white bg-white text-black"
                    : "border-neutral-700 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-[2px] ${
                    active ? "bg-black" : "bg-current"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

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
    </div>
  );
}