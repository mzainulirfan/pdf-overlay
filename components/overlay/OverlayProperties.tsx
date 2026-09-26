"use client";

import type { ReactNode } from "react";
import {
  DEFAULT_STROKE_RATIO,
  normalizeRotation,
  type Overlay,
  type ShapeFillMode,
  type ShapeKind,
} from "@/types/overlay";

const SHAPE_KINDS: { kind: ShapeKind; label: string; icon: ReactNode }[] = [
  {
    kind: "rect",
    label: "Persegi",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <rect x="5" y="7" width="14" height="10" rx="1" />
      </svg>
    ),
  },
  {
    kind: "ellipse",
    label: "Elips",
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <ellipse cx="12" cy="12" rx="8" ry="5.5" />
      </svg>
    ),
  },
  {
    kind: "line",
    label: "Garis",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
        <path strokeLinecap="round" d="M4 12h16" />
      </svg>
    ),
  },
  {
    kind: "arrow",
    label: "Panah",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h13m-4-4 4 4-4 4" />
      </svg>
    ),
  },
];

function ShapeControls({
  overlay,
  onChange,
}: {
  overlay: Overlay;
  onChange: (patch: Partial<Overlay>) => void;
}) {
  const kind = overlay.shape ?? "rect";
  const fillMode: ShapeFillMode =
    overlay.fillMode === "outline" ? "outline" : "solid";
  const strokePct = Math.round(
    (overlay.strokeRatio ?? DEFAULT_STROKE_RATIO) * 100,
  );
  const needsStroke = fillMode === "outline" || kind === "line" || kind === "arrow";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-neutral-400">
          Jenis bentuk
        </span>
        <div
          role="group"
          aria-label="Jenis bentuk"
          className="grid grid-cols-4 gap-1.5"
        >
          {SHAPE_KINDS.map((s) => (
            <button
              key={s.kind}
              type="button"
              onClick={() => onChange({ shape: s.kind })}
              aria-pressed={kind === s.kind}
              title={s.label}
              aria-label={`Bentuk ${s.label.toLowerCase()}`}
              className={`flex flex-col items-center gap-1 rounded-lg border py-2 text-neutral-300 transition-colors hover:bg-neutral-800 ${
                kind === s.kind
                  ? "border-white bg-white/10 text-white"
                  : "border-neutral-700"
              }`}
            >
              {s.icon}
              <span className="text-[10px] leading-none">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {(kind === "rect" || kind === "ellipse") && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-400">Isian</span>
          <div role="group" aria-label="Mode isian bentuk" className="grid grid-cols-2 gap-1.5">
            {(
              [
                { mode: "solid", label: "Penuh" },
                { mode: "outline", label: "Garis tepi" },
              ] as const
            ).map((m) => (
              <button
                key={m.mode}
                type="button"
                onClick={() => onChange({ fillMode: m.mode })}
                aria-pressed={fillMode === m.mode}
                className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                  fillMode === m.mode
                    ? "border-white bg-white text-black"
                    : "border-neutral-700 bg-black text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {needsStroke && (
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between text-xs font-medium text-neutral-400">
            <span>Tebal garis</span>
            <span className="font-semibold tabular-nums text-white">
              {strokePct}%
            </span>
          </span>
          <input
            type="range"
            min={0.5}
            max={15}
            step={0.5}
            value={Math.min(15, Math.max(0.5, strokePct))}
            aria-label="Tebal garis dalam persen sisi terkecil"
            onChange={(e) =>
              onChange({ strokeRatio: Number(e.target.value) / 100 })
            }
            className="w-full accent-white"
          />
        </label>
      )}
    </div>
  );
}

type OverlayPropertiesProps = {
  overlay: Overlay;
  onChange: (patch: Partial<Overlay>) => void;
  onCropImage?: () => void;
};

/** Panel ringkas saat >1 overlay dipilih: hanya aksi massal yang aman. */
export function BulkOverlayProperties({
  selected,
  onBulkOpacity,
  onBulkRotateBy,
  onBulkVisibility,
  onBulkLock,
  onBulkDelete,
}: {
  selected: Overlay[];
  onBulkOpacity: (value: number) => void;
  onBulkRotateBy: (delta: number) => void;
  onBulkVisibility: () => void;
  onBulkLock: () => void;
  onBulkDelete: () => void;
}) {
  const opacities = new Set(selected.map((o) => Math.round(o.opacity * 100)));
  const rotations = new Set(selected.map((o) => o.rotation));
  const allVisible = selected.every((o) => o.visible !== false);
  const allLocked = selected.every((o) => !!o.locked);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          {selected.length} overlay dipilih · berlaku ke semua halaman
        </p>
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
          Bulk
        </span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between text-xs font-medium text-neutral-400">
          <span>Opasitas</span>
          <span className="font-semibold tabular-nums text-white">
            {opacities.size === 1 ? `${[...opacities][0]}%` : "Campuran"}
          </span>
        </span>
        <input
          type="range"
          min={10}
          max={100}
          value={opacities.size === 1 ? [...opacities][0] : 100}
          aria-label="Opasitas semua overlay terpilih"
          onChange={(e) => onBulkOpacity(Number(e.target.value) / 100)}
          className="w-full accent-white"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between text-xs font-medium text-neutral-400">
          <span>Rotasi</span>
          <span className="font-semibold tabular-nums text-white">
            {rotations.size === 1
              ? `${(() => {
                  const r = [...rotations][0];
                  return r > 180 ? r - 360 : r;
                })()}°`
              : "Campuran"}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onBulkRotateBy(-ROTATION_STEP)}
            aria-label={`Putar semua berlawanan arah ${ROTATION_STEP} derajat`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-lg leading-none text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onBulkRotateBy(ROTATION_STEP)}
            aria-label={`Putar semua searah jarum jam ${ROTATION_STEP} derajat`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-lg leading-none text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            +
          </button>
          <span className="text-[11px] text-neutral-600">
            Berlaku ke semua yang dipilih
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-neutral-800 pt-4">
        <button
          type="button"
          onClick={onBulkVisibility}
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          {allVisible ? "Sembunyikan semua" : "Tampilkan semua"}
        </button>
        <button
          type="button"
          onClick={onBulkLock}
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
        >
          {allLocked ? "Buka kunci semua" : "Kunci semua"}
        </button>
        <button
          type="button"
          onClick={onBulkDelete}
          className="rounded-lg border border-red-500/30 bg-black px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          Hapus yang dipilih ({selected.length})
        </button>
      </div>
    </div>
  );
}

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
  onCropImage,
}: OverlayPropertiesProps) {
  const spots = alignSpots(overlay);
  // Tampilan slider memakai rentang -180..180 (minus = berlawanan jarum jam).
  const displayDeg =
    overlay.rotation > 180 ? overlay.rotation - 360 : overlay.rotation;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          {overlay.type === "text"
            ? "Overlay teks"
            : overlay.type === "shape"
              ? "Overlay bentuk"
              : "Overlay gambar"}{" "}
          · berlaku ke semua halaman
        </p>
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
          {overlay.type === "text"
            ? "Teks"
            : overlay.type === "shape"
              ? "Bentuk"
              : "Gambar"}
        </span>
      </div>

      {overlay.type === "shape" && (
        <ShapeControls overlay={overlay} onChange={onChange} />
      )}

      {overlay.type === "text" && (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-xs font-medium text-neutral-400">
              <span>Isi teks</span>
              {(overlay.textCase ?? "none") !== "none" && (
                <span className="text-[11px] text-neutral-500">
                  Tampil sesuai mode kapital di bawah
                </span>
              )}
            </span>
            <textarea
              value={overlay.text ?? ""}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={3}
              placeholder="Tulis teks, Enter untuk baris baru"
              style={{
                textTransform:
                  overlay.textCase === "upper"
                    ? "uppercase"
                    : overlay.textCase === "lower"
                      ? "lowercase"
                      : overlay.textCase === "capitalize"
                        ? "capitalize"
                        : "none",
              }}
              className={`${input} resize-none leading-relaxed`}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-400">
              Gaya font
            </span>
            <div role="group" aria-label="Gaya font" className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { key: "bold", label: "Tebal", symbol: "B", active: overlay.bold ?? true, style: { fontWeight: 700 } },
                  { key: "italic", label: "Miring", symbol: "I", active: !!overlay.italic, style: { fontStyle: "italic" } },
                  { key: "strikethrough", label: "Coret", symbol: "S", active: !!overlay.strikethrough, style: { textDecoration: "line-through" } },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    onChange(
                      s.key === "bold"
                        ? { bold: !(overlay.bold ?? true) }
                        : s.key === "italic"
                          ? { italic: !overlay.italic }
                          : { strikethrough: !overlay.strikethrough },
                    )
                  }
                  aria-pressed={s.active}
                  title={s.label}
                  aria-label={`Font ${s.label.toLowerCase()}`}
                  style={s.style}
                  className={`rounded-lg border py-2 text-sm transition-colors ${
                    s.active
                      ? "border-white bg-white text-black"
                      : "border-neutral-700 bg-black text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  {s.symbol}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-neutral-400">
              Kapitalisasi tampilan
            </span>
            <div
              role="group"
              aria-label="Kapitalisasi tampilan teks"
              className="grid grid-cols-4 gap-1.5"
            >
              {(
                [
                  { key: "none", label: "Seperti diketik", sample: "Abc" },
                  { key: "upper", label: "Kapital semua", sample: "ABC" },
                  { key: "lower", label: "Huruf kecil semua", sample: "abc" },
                  { key: "capitalize", label: "Awal kata besar", sample: "Abc" },
                ] as const
              ).map((c) => {
                const active = (overlay.textCase ?? "none") === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() =>
                      onChange({
                        textCase: c.key === "none" ? undefined : c.key,
                      })
                    }
                    aria-pressed={active}
                    title={c.label}
                    aria-label={`Kapitalisasi: ${c.label.toLowerCase()}`}
                    className={`rounded-lg border py-2 text-sm transition-colors ${
                      active
                        ? "border-white bg-white text-black"
                        : "border-neutral-700 bg-black text-neutral-300 hover:bg-neutral-800"
                    }`}
                  >
                    {c.sample}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-600">
              Hanya mengubah tampilan — isi asli tetap tersimpan.
            </p>
          </div>
        </>
      )}

      {overlay.type !== "text" && (
        <div className="rounded-lg border border-neutral-800 bg-black px-3 py-2 text-xs text-neutral-500">
          Geser untuk memindah. Tarik gagang untuk mengubah panjang dan lebar.
          Atur transparansi lewat slider di bawah.
        </div>
      )}

      {overlay.type === "image" && onCropImage && (
        <button
          type="button"
          onClick={onCropImage}
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-800"
        >
          Potong gambar
        </button>
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