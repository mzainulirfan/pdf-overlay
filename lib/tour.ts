import type { Config, Driver, DriveStep } from "driver.js";

export const TOUR_HOME_SEEN_KEY = "pdf-overlay-tour-home-seen";
export const TOUR_EDITOR_SEEN_KEY = "pdf-overlay-tour-editor-seen";

export function hasSeenTour(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

export function markTourSeen(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Abaikan — tur tetap jalan, hanya tidak diingat.
  }
}

function baseConfig(onDone: () => void): Config {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    animate: !reduceMotion,
    allowClose: true,
    allowKeyboardControl: true,
    overlayColor: "#000000",
    overlayOpacity: 0.7,
    overlayClickBehavior: "close",
    stagePadding: 6,
    stageRadius: 12,
    skipMissingElement: true,
    showProgress: true,
    showButtons: ["previous", "next", "close"],
    progressText: "{{current}} dari {{total}}",
    nextBtnText: "Lanjut",
    prevBtnText: "Kembali",
    doneBtnText: "Selesai",
    popoverClass: "pdf-tour-popover",
    onDestroyed: () => onDone(),
  };
}

const HOME_STEPS: DriveStep[] = [
  {
    element: '[data-tour="dropzone"]',
    popover: {
      title: "Buka PDF di sini",
      description:
        "Tarik file PDF ke kotak ini, atau klik Pilih PDF. Maksimal 25 MB dan 100 halaman.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-tour="open-options"]',
    popover: {
      title: "Cara lain membuka",
      description:
        "Tempel file langsung dengan Ctrl+V, atau buka PDF dari URL.",
      side: "top",
      align: "center",
    },
  },
  {
    element: '[data-tour="how-it-works"]',
    popover: {
      title: "Alur 3 langkah",
      description:
        "Buka PDF, susun overlay, lalu simpan. Overlay berlaku ke semua halaman secara otomatis.",
      side: "top",
      align: "center",
    },
  },
];

const EDITOR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="toolbar"]',
    popover: {
      title: "Tambah overlay",
      description:
        "Tambah teks, gambar, atau bentuk dari sini. Klik chevron untuk preset siap pakai.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="canvas"]',
    popover: {
      title: "Atur di kanvas",
      description:
        "Geser, ubah ukuran, dan putar langsung. Klik untuk memilih, Shift+klik untuk multi-seleksi.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: "Layer & properti",
      description:
        "Urutkan, kunci, sembunyikan, beri nama, dan atur detail tiap overlay di sini.",
      side: "left",
      align: "start",
    },
  },
  {
    element: '[data-tour="save"]',
    popover: {
      title: "Simpan hasil",
      description:
        "Unduh PDF baru dengan overlay di semua halaman, atau cetak langsung.",
      side: "bottom",
      align: "end",
    },
  },
];

async function startTour(
  steps: DriveStep[],
  onDone: () => void,
): Promise<Driver | null> {
  try {
    const { driver } = await import("driver.js");
    const instance = driver({ ...baseConfig(onDone), steps });
    instance.drive();
    return instance;
  } catch {
    onDone();
    return null;
  }
}

export function startHomeTour(onDone: () => void): Promise<Driver | null> {
  return startTour(HOME_STEPS, onDone);
}

export function startEditorTour(onDone: () => void): Promise<Driver | null> {
  // Di layar kecil sidebar adalah display:contents (tanpa box) karena
  // navigasi memakai tab — langkahnya dilewati agar sorotan tidak ngawur.
  const isSmallScreen =
    typeof window !== "undefined" && window.innerWidth < 1024;
  const steps = isSmallScreen
    ? EDITOR_STEPS.filter((s) => s.element !== '[data-tour="sidebar"]')
    : EDITOR_STEPS;
  return startTour(steps, onDone);
}
