export const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_PAGE_COUNT = 100;

export type ValidationResult =
  | { ok: true; message: null }
  | { ok: false; message: string };

export function isLikelyPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function validatePdfFile(file: File): ValidationResult {
  if (file.size === 0) {
    return {
      ok: false,
      message: "File PDF tidak dapat dibaca atau rusak.",
    };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return {
      ok: false,
      message: "Ukuran file terlalu besar. Pilih PDF dengan ukuran maksimal 25 MB.",
    };
  }

  return { ok: true, message: null };
}

export function validateOverlayImage(file: File): ValidationResult {
  const name = file.name.toLowerCase();
  const isSupported =
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg");

  if (!isSupported) {
    return {
      ok: false,
      message: "Gambar tidak dapat digunakan. Pilih file PNG atau JPG.",
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      message: "Ukuran gambar terlalu besar. Maksimal 5 MB.",
    };
  }

  return { ok: true, message: null };
}

export function validatePageCount(totalPages: number): ValidationResult {
  if (totalPages > MAX_PAGE_COUNT) {
    return {
      ok: false,
      message: `Dokumen memiliki ${totalPages} halaman. Maksimal ${MAX_PAGE_COUNT} halaman didukung.`,
    };
  }
  return { ok: true, message: null };
}
