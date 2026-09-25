import type { OverlayTemplate, StoredOverlay } from "@/types/template";
import { normalizeRotation } from "@/types/overlay";

const STORAGE_KEY = "pdf-overlay-templates";
const ACTIVE_KEY = "pdf-overlay-active-template";

/**
 * Template lama (versi single-overlay) disimpan dengan properti overlay
 * langsung di root. Migrasi ini mengubahnya menjadi format array `overlays[]`.
 */
function normalizeTemplate(raw: unknown): OverlayTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.name !== "string") return null;

  const base = { id: t.id, name: t.name };

  if (Array.isArray(t.overlays)) {
    return { ...base, overlays: t.overlays as StoredOverlay[] };
  }

  if (t.type === "text" || t.type === "image" || t.type === "shape") {
    const stored: StoredOverlay = {
      type: t.type,
      text: typeof t.text === "string" ? t.text : undefined,
      imageDataUrl: typeof t.imageDataUrl === "string" ? t.imageDataUrl : undefined,
      xRatio: Number(t.xRatio) || 0.375,
      yRatio: Number(t.yRatio) || 0.45,
      widthRatio: Number(t.widthRatio) || 0.25,
      heightRatio: Number(t.heightRatio) || 0.1,
      rotation:
        typeof t.rotation === "number"
          ? normalizeRotation(t.rotation)
          : 0,
      opacity: typeof t.opacity === "number" ? t.opacity : 1,
    };
    return { ...base, overlays: [stored] };
  }

  return null;
}

export function loadTemplates(): OverlayTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed
      .map(normalizeTemplate)
      .filter((t): t is OverlayTemplate => t !== null);
    if (normalized.length !== parsed.length) {
      persistTemplates(normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

export function persistTemplates(templates: OverlayTemplate[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Kuota localStorage penuh — abaikan agar tidak menghentikan alur.
  }
}

export function loadActiveTemplateId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function persistActiveTemplateId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id === null) {
    window.localStorage.removeItem(ACTIVE_KEY);
  } else {
    window.localStorage.setItem(ACTIVE_KEY, id);
  }
}
