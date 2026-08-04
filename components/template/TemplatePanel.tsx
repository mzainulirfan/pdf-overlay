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
};

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

export default function TemplatePanel({
  templates,
  activeTemplateId,
  canSave,
  onSelect,
  onSave,
  onDelete,
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
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Template</h2>
        <p className="mt-1 text-xs text-slate-500">
          Template aktif diterapkan otomatis saat PDF baru dibuka.
        </p>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-3 py-4 text-center text-xs text-slate-500">
          Belum ada template. Atur overlay sekali, lalu simpan agar bisa dipakai
          ulang.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                activeTemplateId === null
                  ? "border-indigo-500 bg-indigo-50 font-medium text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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
                title={`Terapkan "${t.name}" ke halaman`}
                className={`flex-1 truncate rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  activeTemplateId === t.id
                    ? "border-indigo-500 bg-indigo-50 font-medium text-indigo-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t.name}
              </button>
              <button
                type="button"
                onClick={() => onDelete(t.id)}
                aria-label={`Hapus template ${t.name}`}
                className="rounded-lg border border-slate-200 px-2 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
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
              className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSaveForm(false);
                setName("");
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
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
          title={
            canSave
              ? "Simpan semua overlay saat ini sebagai template"
              : "Tambahkan overlay terlebih dahulu"
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Simpan sebagai Template
        </button>
      )}
    </div>
  );
}