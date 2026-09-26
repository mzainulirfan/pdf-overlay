"use client";

import { useEffect, useRef, useState } from "react";
import type { Overlay, ShapeKind } from "@/types/overlay";
import { applyTextCase } from "@/lib/overlay-renderer";

type OverlayListProps = {
  overlays: Overlay[];
  selectedIds: Set<string>;
  onSelect: (id: string, mod: { additive: boolean; range: boolean }) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onMoveTo: (id: string, toArrayIndex: number) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string | undefined) => void;
};

const SHAPE_NAMES: Record<ShapeKind, string> = {
  rect: "Persegi",
  ellipse: "Elips",
  line: "Garis",
  arrow: "Panah",
};

function baseLabel(overlay: Overlay): string {
  if (overlay.name?.trim()) return overlay.name.trim();
  if (overlay.type === "text") {
    // Samakan dengan kanvas: tampilkan hasil kapitalisasi, bukan isi mentah.
    const firstLine = applyTextCase(overlay.text ?? "", overlay.textCase)
      .split("\n")[0]
      .trim();
    return firstLine || "Teks";
  }
  if (overlay.type === "shape") return SHAPE_NAMES[overlay.shape ?? "rect"];
  return "Gambar";
}

/**
 * Label layer: nomor hanya ditambahkan bila ada ≥2 overlay berlabel dasar
 * sama (perbandingan tak sensitif huruf besar-kecil). Tunggal = polos.
 */
export function overlayLabel(overlay: Overlay, overlays: Overlay[]): string {
  const base = baseLabel(overlay);
  const group = overlays.filter(
    (o) => baseLabel(o).toLowerCase() === base.toLowerCase(),
  );
  if (group.length <= 1) return base;
  const pos = group.findIndex((o) => o.id === overlay.id) + 1;
  return `${base} ${pos}`;
}

/** Path Heroicons (outline) — jangan diubah sembarang, bentuknya presisi. */
const PATHS = {
  chevronUp: "M5 15l7-7 7 7",
  chevronDown: "M19 9l-7 7-7-7",
  duplicate:
    "M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-7.5a2.25 2.25 0 0 1 2.25-2.25h6Z",
  lockClosed:
    "M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z",
  lockOpen:
    "M18 1.5c2.9 0 5.25 2.35 5.25 5.25v3.75a.75.75 0 0 1-1.5 0V6.75a3.75 3.75 0 1 0-7.5 0v3a3 3 0 0 1 3 3v6.75a3 3 0 0 1-3 3H3.75a3 3 0 0 1-3-3v-6.75a3 3 0 0 1 3-3h9v-3c0-2.9 2.35-5.25 5.25-5.25Z",
  eye: "M2.05 12.55a1 1 0 0 1 0-.1 11.36 11.36 0 0 1 19.9 0 1 1 0 0 1 0 .1 11.36 11.36 0 0 1-19.9 0zm9.95 3.45a4 4 0 1 1 0-8 4 4 0 0 1 0 8z",
  eyeSlash:
    "M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88",
  x: "M6 18L18 6M6 6l12 12",
} as const;

const miniButton =
  "flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

const miniDanger =
  "flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 text-neutral-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300";

const miniActive =
  "flex h-7 w-7 items-center justify-center rounded-md border border-white/40 bg-white/10 text-white transition-colors hover:bg-white/20";

function ShapeBadge({ kind }: { kind: ShapeKind }) {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden
    >
      {kind === "rect" && <rect x="5" y="8" width="14" height="8" />}
      {kind === "ellipse" && <ellipse cx="12" cy="12" rx="8" ry="5" />}
      {kind === "line" && <path strokeLinecap="round" d="M4 12h16" />}
      {kind === "arrow" && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 12h13m-4-4 4 4-4 4"
        />
      )}
    </svg>
  );
}

function MiniIcon({ d, solid }: { d: string; solid?: boolean }) {
  if (solid) {
    return (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path fillRule="evenodd" d={d} clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function OverlayList({
  overlays,
  selectedIds,
  onSelect,
  onDelete,
  onToggleVisibility,
  onToggleLock,
  onMove,
  onMoveTo,
  onDuplicate,
  onRename,
}: OverlayListProps) {
  // ID overlay yang sedang diseret + posisi drop dalam urutan tampil (0..n).
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropDisplayPos, setDropDisplayPos] = useState<number | null>(null);
  // Konfirmasi hapus 2-klik: klik pertama arm (memerah), klik kedua eksekusi.
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const armTimerRef = useRef<number | null>(null);
  // Rename inline: id baris yang sedang diedit + draf teksnya.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [listOpen, setListOpen] = useState(true);

  const startRename = (overlay: Overlay) => {
    setEditingId(overlay.id);
    setDraft(overlay.name ?? "");
  };

  const commitRename = (overlay: Overlay) => {
    const next = draft.trim();
    if ((next || undefined) !== (overlay.name ?? undefined)) {
      onRename(overlay.id, next || undefined);
    }
    setEditingId(null);
  };

  useEffect(
    () => () => {
      if (armTimerRef.current) window.clearTimeout(armTimerRef.current);
    },
    [],
  );

  const requestDelete = (id: string) => {
    if (armedDeleteId === id) {
      if (armTimerRef.current) window.clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
      setArmedDeleteId(null);
      onDelete(id);
      return;
    }
    if (armTimerRef.current) window.clearTimeout(armTimerRef.current);
    setArmedDeleteId(id);
    armTimerRef.current = window.setTimeout(() => {
      armTimerRef.current = null;
      setArmedDeleteId(null);
    }, 3000);
  };

  // Tampil terbalik: baris paling atas = lapisan paling depan,
  // seperti panel Layers di aplikasi desain.
  const ordered = overlays
    .map((overlay, arrayIndex) => ({ overlay, arrayIndex }))
    .reverse();

  if (overlays.length === 0) return null;

  const clearDrag = () => {
    setDragId(null);
    setDropDisplayPos(null);
  };

  const commitDrop = (targetDisplayPos: number) => {
    if (dragId) {
      // Posisi tampil p (0 = paling atas) = indeks array n - p.
      onMoveTo(dragId, overlays.length - targetDisplayPos);
    }
    clearDrag();
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onDoubleClick={() => setListOpen((v) => !v)}
        aria-expanded={listOpen}
        aria-controls="overlay-layer-list"
        title="Klik 2x untuk buka/tutup daftar"
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-medium text-neutral-400">
          Daftar layer{" "}
          {selectedIds.size > 0 && (
            <span className="text-neutral-200">
              · {selectedIds.size} dipilih
            </span>
          )}
          <span className="text-neutral-600"> · klik 2x</span>
        </span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${listOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        className={`collapse-anim ${listOpen ? "open" : "closed"}`}
        inert={!listOpen}
      >
      <div className="collapse-inner">
      <ul id="overlay-layer-list" className="flex flex-col gap-1.5" aria-label="Daftar overlay">
        {ordered.map(({ overlay, arrayIndex }, displayIndex) => {
          const isSelected = selectedIds.has(overlay.id);
          const isVisible = overlay.visible !== false;
          const isLocked = !!overlay.locked;
          const isFront = arrayIndex === overlays.length - 1;
          const isBack = arrayIndex === 0;
          const label = overlayLabel(overlay, overlays);
          const isDragging = dragId === overlay.id;
          const showDropAbove = dropDisplayPos === displayIndex;
          const showDropBelow =
            dropDisplayPos === displayIndex + 1 && !isDragging;
          return (
            <li key={overlay.id} className="flex flex-col">
              <div
                aria-hidden
                className={`h-0.5 rounded-full bg-white transition-all ${
                  showDropAbove ? "my-1 opacity-100" : "opacity-0"
                }`}
              />
              <div
                draggable
                onDragStart={(e) => {
                  setDragId(overlay.id);
                  setDropDisplayPos(null);
                  e.dataTransfer.effectAllowed = "move";
                  // Wajib untuk Firefox, kalau tidak drag tidak mulai.
                  e.dataTransfer.setData("text/plain", overlay.id);
                }}
                onDragEnd={clearDrag}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  const rect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  const before =
                    e.clientY - rect.top < rect.height / 2;
                  setDropDisplayPos(
                    before ? displayIndex : displayIndex + 1,
                  );
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  // Cegah handler drop global (ganti PDF) ikut bereaksi.
                  e.stopPropagation();
                  const rect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  const before =
                    e.clientY - rect.top < rect.height / 2;
                  commitDrop(before ? displayIndex : displayIndex + 1);
                }}
                title={`Seret untuk mengurutkan ${label}`}
                className={`group flex cursor-grab select-none flex-col gap-1 rounded-lg border p-1.5 transition-colors active:cursor-grabbing ${
                  isSelected
                    ? "border-white bg-white/5"
                    : "border-neutral-800 bg-black/40"
                } ${isVisible ? "" : "opacity-60"} ${
                  isDragging ? "opacity-40" : ""
                }`}
              >
              {editingId === overlay.id ? (
                <div className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1">
                  <span
                    aria-hidden
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20 text-[10px] font-bold text-white"
                  >
                    ✎
                  </span>
                  <input
                    type="text"
                    value={draft}
                    autoFocus
                    maxLength={40}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitRename(overlay)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Nama baru untuk ${label}`}
                    placeholder="Nama layer (kosongkan = otomatis)"
                    className="min-w-0 flex-1 rounded-md border border-white/40 bg-black px-2 py-0.5 text-sm text-white outline-none placeholder:text-neutral-600"
                  />
                </div>
              ) : (
              <div className="flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  const additive =
                    e.shiftKey || e.ctrlKey || e.metaKey;
                  onSelect(overlay.id, { additive, range: e.shiftKey });
                }}
                onDoubleClick={() => startRename(overlay)}
                aria-pressed={isSelected}
                title={`Pilih overlay ${label} (Shift = range, Ctrl = tambah, klik 2x = ubah nama)`}
                className={`flex min-w-0 flex-1 items-center gap-2 truncate rounded-md px-1.5 py-1 text-left text-sm transition-colors ${
                  isSelected
                    ? "font-medium text-white"
                    : "text-neutral-300 hover:bg-neutral-800/60"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                    overlay.type === "text"
                      ? "bg-white/20 text-white"
                      : "bg-neutral-700/60 text-neutral-300"
                  }`}
                >
                  {overlay.type === "text" ? (
                    "T"
                  ) : overlay.type === "shape" ? (
                    <ShapeBadge kind={overlay.shape ?? "rect"} />
                  ) : (
                    "G"
                  )}
                </span>
                <span className="truncate">
                  {label}
                </span>
                {isLocked && (
                  <span aria-hidden className="shrink-0 text-neutral-300">
                    <MiniIcon d={PATHS.lockClosed} solid />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => startRename(overlay)}
                aria-label={`Ubah nama overlay ${label}`}
                title="Ubah nama"
                className="shrink-0 rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-800/60 hover:text-neutral-200"
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
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.75 2.75 0 0 1 15.25 21H5.25A2.75 2.75 0 0 1 2.5 18.25v-9.5A2.75 2.75 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
              </div>
              )}
              <div
                role="group"
                aria-label={`Aksi untuk overlay ${label}`}
                className={`items-center gap-1 pl-8 ${
                  isSelected ? "flex" : "hidden group-focus-within:flex"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onMove(overlay.id, 1)}
                  disabled={isFront}
                  aria-label={`Pindahkan ${label} ke lapisan atas`}
                  title="Ke lapisan atas (depan)"
                  className={miniButton}
                >
                  <MiniIcon d={PATHS.chevronUp} />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(overlay.id, -1)}
                  disabled={isBack}
                  aria-label={`Pindahkan ${label} ke lapisan bawah`}
                  title="Ke lapisan bawah (belakang)"
                  className={miniButton}
                >
                  <MiniIcon d={PATHS.chevronDown} />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(overlay.id)}
                  aria-label={`Duplikat overlay ${label}`}
                  title="Duplikat"
                  className={miniButton}
                >
                  <MiniIcon d={PATHS.duplicate} />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLock(overlay.id)}
                  aria-pressed={isLocked}
                  aria-label={
                    isLocked
                      ? `Buka kunci overlay ${label}`
                      : `Kunci overlay ${label}`
                  }
                  title={isLocked ? "Buka kunci" : "Kunci posisi"}
                  className={isLocked ? miniActive : miniButton}
                >
                  <MiniIcon
                    d={isLocked ? PATHS.lockClosed : PATHS.lockOpen}
                    solid
                  />
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
                  className={isVisible ? miniButton : miniActive}
                >
                  <MiniIcon d={isVisible ? PATHS.eye : PATHS.eyeSlash} />
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(overlay.id)}
                  aria-label={
                    armedDeleteId === overlay.id
                      ? `Klik sekali lagi untuk menghapus overlay ${label}`
                      : `Hapus overlay ${label}`
                  }
                  title={
                    armedDeleteId === overlay.id
                      ? "Klik sekali lagi untuk menghapus"
                      : "Hapus (bisa diurungkan)"
                  }
                  className={
                    armedDeleteId === overlay.id
                      ? "flex h-7 w-7 items-center justify-center rounded-md border border-red-500 bg-red-600 text-white transition-colors hover:bg-red-500"
                      : miniDanger
                  }
                >
                  <MiniIcon d={PATHS.x} />
                </button>
              </div>
              </div>
              <div
                aria-hidden
                className={`h-0.5 rounded-full bg-white transition-all ${
                  showDropBelow ? "my-1 opacity-100" : "opacity-0"
                }`}
              />
            </li>
          );
        })}
      </ul>
      </div>
      </div>
      <p className="text-[11px] leading-relaxed text-neutral-600">
        Seret baris untuk mengurutkan (atas = depan). Tombol ↑/↓ tetap bisa
        dipakai via keyboard & layar sentuh.
      </p>
    </div>
  );
}
