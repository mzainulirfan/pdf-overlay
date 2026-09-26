"use client";

import { useEffect, useRef, useState } from "react";
import type { Overlay } from "@/types/overlay";
import type { OverlayTemplate } from "@/types/template";
import { overlayLabel } from "@/components/overlay/OverlayList";

type TemplatePanelProps = {
  templates: OverlayTemplate[];
  activeTemplateId: string | null;
  canSave: boolean;
  /** Overlay aktif di canvas (untuk checklist inklusi saat menyimpan). */
  overlays: Overlay[];
  onSelect: (id: string | null, mode?: "append" | "replace") => void;
  onSave: (name: string, overlayIds?: string[]) => void;
  onDelete: (id: string) => void;
};

const input =
  "w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-neutral-100 outline-none transition-shadow placeholder:text-neutral-600 focus:border-white focus:ring-2 focus:ring-white/30";

export default function TemplatePanel({
  templates,
  activeTemplateId,
  canSave,
  overlays,
  onSelect,
  onSave,
  onDelete,
}: TemplatePanelProps) {
  // Template yang menunggu pilihan Tambahkan/Ganti (bila kanvas tak kosong).
  const [pendingApplyId, setPendingApplyId] = useState<string | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [name, setName] = useState("");
  // null = semua ikut; Set = hanya ID terpilih yang ikut tersimpan.
  const [includedIds, setIncludedIds] = useState<Set<string> | null>(null);
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const armTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (armTimerRef.current) window.clearTimeout(armTimerRef.current);
    },
    [],
  );

  const openSaveForm = () => {
    setIncludedIds(new Set(overlays.map((o) => o.id)));
    setShowSaveForm(true);
  };

  const toggleInclude = (id: string) => {
    setIncludedIds((prev) => {
      const base = prev ?? new Set(overlays.map((o) => o.id));
      const next = new Set(base);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ids = includedIds ? [...includedIds] : undefined;
    if (ids && ids.length === 0) return;
    onSave(trimmed, ids);
    setName("");
    setIncludedIds(null);
    setShowSaveForm(false);
  };

  const duplicateName =
    name.trim() !== "" &&
    templates.some(
      (t) => t.name.toLowerCase() === name.trim().toLowerCase(),
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

  return (
    <div className="flex flex-col gap-4">
      {templates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-700 bg-black/60 px-3 py-4 text-center text-xs text-neutral-500">
          Belum ada template. Atur overlay sekali, lalu simpan agar bisa dipakai
          ulang.
        </p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-0.5" aria-label="Daftar template tersimpan">
          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              aria-pressed={activeTemplateId === null}
              title="Berhenti menerapkan template otomatis. Overlay di kanvas tidak diubah."
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                activeTemplateId === null
                  ? "border-white bg-white/15 font-medium text-white"
                  : "border-neutral-700 bg-black text-neutral-300 hover:bg-neutral-800"
              }`}
            >
              Nonaktifkan template
            </button>
          </li>
          {templates.map((t) => {
            const kinds = Array.from(
              new Set(
                t.overlays.map((o) => (o.type === "image" ? "G" : "T")),
              ),
            )
              .sort()
              .join("+");
            const armed = armedDeleteId === t.id;
            return (
            <li key={t.id} className="flex flex-col gap-1.5">
              <div className="flex items-stretch gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (overlays.length > 0 && activeTemplateId !== t.id) {
                    setPendingApplyId(t.id);
                  } else {
                    onSelect(t.id);
                  }
                }}
                aria-pressed={activeTemplateId === t.id}
                title={`Terapkan "${t.name}" ke halaman`}
                className={`flex min-w-0 flex-1 flex-col rounded-lg border px-3 py-2 text-left transition-colors ${
                  activeTemplateId === t.id
                    ? "border-white bg-white/15 font-medium text-white"
                    : "border-neutral-700 bg-black text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                <span className="block w-full truncate text-sm">{t.name}</span>
                <span className="block text-[11px] text-neutral-500">
                  {t.overlays.length} overlay · {kinds}
                </span>
              </button>
              <button
                type="button"
                onClick={() => requestDelete(t.id)}
                aria-label={
                  armed
                    ? `Klik sekali lagi untuk menghapus template ${t.name}`
                    : `Hapus template ${t.name}`
                }
                title={armed ? "Klik sekali lagi untuk menghapus" : "Hapus template"}
                className={`rounded-lg border px-2 transition-colors ${
                  armed
                    ? "border-red-500 bg-red-600 text-white hover:bg-red-500"
                    : "border-neutral-700 text-neutral-500 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
                }`}
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
              </div>
              {pendingApplyId === t.id && (
                <div className="rounded-lg border border-neutral-700 bg-black/40 p-2.5">
                  <p className="text-xs text-neutral-400">
                    Kanvas sudah berisi {overlays.length} overlay. Terapkan
                    “{t.name}” sebagai:
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(t.id, "append");
                        setPendingApplyId(null);
                      }}
                      className="flex-1 rounded-lg border border-neutral-700 px-2 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-800"
                    >
                      Tambahkan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(t.id, "replace");
                        setPendingApplyId(null);
                      }}
                      className="flex-1 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-300"
                    >
                      Ganti semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingApplyId(null)}
                      className="rounded-lg border border-neutral-700 px-2 py-1.5 text-xs text-neutral-400 transition-colors hover:bg-neutral-800"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </li>
            );
          })}
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
            aria-describedby={
              duplicateName ? "template-name-warning" : undefined
            }
            className={input}
          />
          {duplicateName && (
            <p id="template-name-warning" className="text-xs text-amber-300">
              Nama ini sudah dipakai — gunakan nama lain.
            </p>
          )}
          <fieldset className="flex flex-col gap-1.5 rounded-lg border border-neutral-800 bg-black/40 p-2.5">
            <legend className="px-1 text-[11px] font-medium text-neutral-500">
              Overlay yang ikut tersimpan
            </legend>
            {overlays.map((o) => {
              const checked = includedIds ? includedIds.has(o.id) : true;
              const hidden = o.visible === false;
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-neutral-800/60 ${
                    hidden ? "opacity-60" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleInclude(o.id)}
                    className="h-4 w-4 shrink-0 accent-white"
                  />
                  <span
                    aria-hidden
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-neutral-700/60 text-[10px] font-bold text-neutral-300"
                  >
                    {o.type === "text"
                      ? "T"
                      : o.type === "shape"
                        ? "B"
                        : "G"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-neutral-200">
                    {overlayLabel(o, overlays)}
                  </span>
                  {hidden && (
                    <span className="shrink-0 text-[10px] text-neutral-500">
                      tersembunyi
                    </span>
                  )}
                </label>
              );
            })}
          </fieldset>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={
                !name.trim() ||
                duplicateName ||
                (includedIds?.size ?? 1) === 0
              }
              title={
                duplicateName
                  ? "Nama sudah dipakai template lain"
                  : (includedIds?.size ?? 1) === 0
                    ? "Pilih minimal satu overlay"
                    : "Simpan template"
              }
              className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSaveForm(false);
                setName("");
                setIncludedIds(null);
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
          onClick={openSaveForm}
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