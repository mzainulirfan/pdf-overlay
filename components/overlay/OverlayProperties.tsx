"use client";

import { normalizeRotation, type Overlay } from "@/types/overlay";

type OverlayPropertiesProps = {
  overlay: Overlay;
  onChange: (patch: Partial<Overlay>) => void;
};

const ROTATION_STEP = 5;

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

const input =
  "w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-neutral-100 outline-none transition-shadow placeholder:text-neutral-600 focus:border-white focus:ring-2 focus:ring-white/30";

export default function OverlayProperties({
  overlay,
  onChange,
}: OverlayPropertiesProps) {
  const spots = alignSpots(overlay);
  // Tampilan slider memakai rentang -180..180 (minus = berlawanan jarum jam).
  const displayDeg =
    overlay.rotation > 180 ? overlay.rotation - 360 : overlay.rotation;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">Properti Overlay</h2>
          <p className="mt-1 text-xs text-neutral-500">
            {overlay.type === "text"
              ? "Overlay teks"
              : overlay.type === "shape"
                ? "Overlay bentuk"
                : "Overlay gambar"}{" "}
            · berlaku ke semua halaman
          </p>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
          {overlay.type === "text"
            ? "Teks"
            : overlay.type === "shape"
              ? "Bentuk"
              : "Gambar"}
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">Nama layer</span>
        <input
          key={overlay.id}
          type="text"
          value={overlay.name ?? ""}
          maxLength={40}
          onChange={(e) => {
            const next = e.target.value;
            if (next !== (overlay.name ?? "")) {
              onChange({ name: next.trim() ? next : undefined });
            }
          }}
          placeholder="Otomatis (ikut isi teks)"
          aria-label="Nama layer overlay"
          className={input}
        />
      </label>

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

      {overlay.type !== "text" && (
        <div className="rounded-lg border border-neutral-800 bg-black px-3 py-2 text-xs text-neutral-500">
          Geser untuk memindah. Tarik gagang untuk mengubah panjang dan lebar.
          Atur transparansi lewat slider di bawah.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">Posisi</span>
        <div
          role="group"
          aria-label="Align cepat"
          className="grid grid-cols-3 gap-1"
        >
          {spots.map((spot, spotIndex) => {
            const active =
              Math.abs(overlay.xRatio - spot.x) < 0.01 &&
              Math.abs(overlay.yRatio - spot.y) < 0.01;
            const row = Math.floor(spotIndex / 3);
            const col = spotIndex % 3;
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
                  className="grid grid-cols-3 gap-[2px]"
                >
                  {Array.from({ length: 9 }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1 w-1 rounded-full ${
                        i === row * 3 + col
                          ? "bg-current opacity-100"
                          : "bg-current opacity-25"
                      }`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between text-xs font-medium text-neutral-400">
          <span>Opasitas</span>
          <span className="font-semibold tabular-nums text-white">
            {Math.round(overlay.opacity * 100)}%
          </span>
        </span>
        <input
          type="range"
          min={10}
          max={100}
          value={Math.round(overlay.opacity * 100)}
          aria-describedby="opacity-hint"
          onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
          className="w-full accent-white"
        />
        <span id="opacity-hint" className="text-[11px] text-neutral-600">
          100% = pekat. Min 10% agar overlay tetap terlihat.
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between text-xs font-medium text-neutral-400">
          <span>Rotasi</span>
          <span className="flex items-center gap-2">
            <span className="font-semibold tabular-nums text-white">
              {displayDeg}°
            </span>
            <button
              type="button"
              onClick={() => onChange({ rotation: 0 })}
              disabled={displayDeg === 0}
              title="Kembali ke 0°"
              className="rounded text-[11px] font-medium text-neutral-500 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            >
              Reset
            </button>
          </span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onChange({
                rotation: normalizeRotation(displayDeg - ROTATION_STEP),
              })
            }
            aria-label={`Putar berlawanan arah ${ROTATION_STEP} derajat`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-lg leading-none text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            −
          </button>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={displayDeg}
            aria-label="Rotasi dalam derajat"
            onChange={(e) =>
              onChange({ rotation: normalizeRotation(Number(e.target.value)) })
            }
            className="w-full accent-white"
          />
          <button
            type="button"
            onClick={() =>
              onChange({
                rotation: normalizeRotation(displayDeg + ROTATION_STEP),
              })
            }
            aria-label={`Putar searah jarum jam ${ROTATION_STEP} derajat`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-lg leading-none text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}