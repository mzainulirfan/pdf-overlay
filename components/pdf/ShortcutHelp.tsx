"use client";

import { useEffect } from "react";

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "Ctrl + S", desc: "Simpan PDF" },
  { keys: "Ctrl + P", desc: "Cetak PDF" },
  { keys: "Ctrl + Z", desc: "Urungkan hapus terakhir" },
  { keys: "Delete / Backspace", desc: "Hapus overlay terpilih" },
  { keys: "Esc", desc: "Tutup menu / batalkan pilihan" },
  { keys: "Shift (tahan)", desc: "Snap putar tiap 15°" },
  { keys: "Enter", desc: "Konfirmasi isian angka / nama" },
];

export default function ShortcutHelp({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2
            id="shortcut-dialog-title"
            className="text-sm font-semibold text-neutral-100"
          >
            Shortcut keyboard
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup bantuan shortcut"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
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
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-neutral-400">{s.desc}</span>
              <kbd className="shrink-0 rounded-md border border-neutral-700 bg-black px-2 py-0.5 font-mono text-xs text-neutral-200">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-neutral-500">
          Ctrl+Z hanya mengurungkan hapus — geser, putar, dan ubahan lain
          tidak masuk riwayat undo.
        </p>
      </div>
    </div>
  );
}
