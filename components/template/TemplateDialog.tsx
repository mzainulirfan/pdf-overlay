"use client";

import { useEffect, useRef } from "react";
import TemplatePanel from "@/components/template/TemplatePanel";
import type { Overlay } from "@/types/overlay";
import type { OverlayTemplate } from "@/types/template";

type TemplateDialogProps = {
  open: boolean;
  templates: OverlayTemplate[];
  activeTemplateId: string | null;
  canSave: boolean;
  overlays: Overlay[];
  onSelect: (id: string | null) => void;
  onSave: (name: string, overlayIds?: string[]) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export default function TemplateDialog({
  open,
  templates,
  activeTemplateId,
  canSave,
  overlays,
  onSelect,
  onSave,
  onDelete,
  onClose,
}: TemplateDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fokus ke judul saat dibuka, kembalikan ke pemicu saat ditutup.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    return () => {
      previous?.focus?.();
    };
  }, [open]);

  // Kunci scroll body selama dialog terbuka.
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // Escape menutup; Tab terjebak di dalam dialog (focus trap).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="template-dialog-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-sm font-semibold text-neutral-100 outline-none"
          >
            Kelola Template
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog template"
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
        <p className="mt-1 text-xs text-neutral-500">
          Template aktif diterapkan otomatis saat PDF baru dibuka.
        </p>
        <div className="mt-4">
          <TemplatePanel
            templates={templates}
            activeTemplateId={activeTemplateId}
            canSave={canSave}
            overlays={overlays}
            onSelect={onSelect}
            onSave={onSave}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
