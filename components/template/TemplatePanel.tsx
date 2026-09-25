"use client";

import { useState } from "react";
import type { OverlayTemplate } from "@/types/template";

type TemplatePanelProps = {
  templates: OverlayTemplate[];
  activeTemplateId: string | null;
  canSave: boolean;
  onSelect: (id: string | null) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  /** Sembunyikan heading internal bila panel sudah punya judul dari section induk. */
  showHeader?: boolean;
};

const input =
  "w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-neutral-100 outline-none transition-shadow placeholder:text-neutral-600 focus:border-white focus:ring-2 focus:ring-white/30";

export default function TemplatePanel({
  templates,
  activeTemplateId,
  canSave,
  onSelect,
  onSave,
  onDelete,
  showHeader = true,
}: TemplatePanelProps) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [name, setName] = useState("");

  const submitSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName("");
    setShowSaveForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {showHeader && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">Template</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Template aktif diterapkan otomatis saat PDF baru dibuka.
          </p>
        </div>
      )}

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-700 bg-black/60 px-3 py-4 text-center text-xs text-neutral-500">
          Belum ada template. Atur overlay sekali, lalu simpan agar bisa dipakai
          ulang.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-pressed={activeTemplateId === null}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                activeTemplateId === null
                  ? "border-white bg-white/15 font-medium text-white"
                  : "border-neutral-700 bg-black text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              Tanpa Template
            </button>
          </li>
          {templates.map((t) => (
            <li key={t.id} className="flex items-stretch gap-1.5">
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                aria-pressed={activeTemplateId === t.id}
                title={`Terapkan "${t.name}" ke halaman`}
                className={`flex-1 truncate rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  activeTemplateId === t.id
                    ? "border-white bg-white/15 font-medium text-white"
                    : "border-neutral-700 bg-black text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                {t.name}
              </button>
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                aria-label={`Hapus template ${t.name}`}
                className="rounded-lg border border-neutral-700 px-2 text-neutral-500 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showSaveForm ? (
        <form
          id="save-template-form"
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitSave();
          }}
        >
          <input
            type="text"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama template, mis. FRAGILE"
            className={input}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSaveForm(false);
                setName("");
              }}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Batal
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowSaveForm(true)}
          disabled={!canSave}
          aria-expanded={showSaveForm}
          aria-controls="save-template-form"
          title={
            canSave
              ? "Simpan semua overlay saat ini sebagai template"
              : "Tambahkan overlay terlebih dahulu"
          }
          className="rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Simpan sebagai Template
        </button>
      )}
    </div>
  );
}