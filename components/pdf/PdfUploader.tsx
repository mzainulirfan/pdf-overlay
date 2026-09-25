"use client";

import { useCallback, useRef, useState } from "react";
import { isLikelyPdfFile, validatePdfFile } from "@/lib/file-validator";

type PdfUploaderProps = {
  onSelect: (file: File) => void;
  onSelectUrl: (url: string) => Promise<void> | void;
};

const STEPS = [
  { n: "01", t: "Buka PDF", d: "Drop, pilih, tempel, atau URL." },
  { n: "02", t: "Atur overlay", d: "Geser & ubah ukuran sekali." },
  { n: "03", t: "Simpan / Cetak", d: "Otomatis ke semua halaman." },
];

const FEATURES = [
  {
    title: "Proses lokal",
    desc: "File dari perangkat tidak diunggah.",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  {
    title: "Semua halaman",
    desc: "Satu overlay berlaku global.",
    icon: "M6 7h11M9 11h8M7 15h10m-7 4h4",
  },
  {
    title: "Drag & resize",
    desc: "Geser bebas, terkunci di halaman.",
    icon: "M15 13l-3-3m0 0-3 3m3-3v8M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6h.1a5 5 0 0 1 1 9.9",
  },
  {
    title: "Teks & gambar",
    desc: "FRAGILE, PNG/JPG transparan.",
    icon: "M12 5v14m-7-7h14",
  },
  {
    title: "Template",
    desc: "Simpan & pakai ulang sekali klik.",
    icon: "M17 3H7a2 2 0 0 0-2 2v16l7-3 7 3V5a2 2 0 0 0-2-2z",
  },
  {
    title: "Tanpa daftar",
    desc: "Langsung pakai, tanpa akun.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
];

export default function PdfUploader({ onSelect, onSelectUrl }: PdfUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [url, setUrl] = useState("");
  const [isUrlLoading, setIsUrlLoading] = useState(false);

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) {
        setDragError("Tidak ada file yang ditemukan.");
        return;
      }
      if (!isLikelyPdfFile(file)) {
        setDragError("Format file tidak didukung. Pilih file PDF.");
        return;
      }
      const validation = validatePdfFile(file);
      if (!validation.ok) {
        setDragError(validation.message);
        return;
      }
      setDragError(null);
      onSelect(file);
    },
    [onSelect],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) {
        setDragError("Tidak ada file yang ditemukan.");
        return;
      }
      handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col items-center">
      {/* Top bar minimal */}
      <div className="flex w-full max-w-3xl items-center justify-between py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
            <svg
              className="h-4.5 w-4.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 21h10a2 2 0 0 0 2-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 12.586 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-neutral-100">
            PDF Overlay
          </span>
        </div>
        <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
          Maks 25 MB · 100 hlmn
        </span>
      </div>

      {/* Hero minimal */}
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          100% di browser · tanpa upload
        </div>

        <h1 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Beri tanda <span className="text-white">FRAGILE</span>
          <br />
          ke seluruh halaman PDF
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-neutral-400">
          Buka PDF, geser overlay ke posisi pas, simpan atau cetak. Selesai
          dalam hitungan detik.
        </p>
      </div>

      {/* Dropzone */}
      <div
        role="group"
        aria-labelledby="pdf-dropzone-title"
        aria-describedby="pdf-dropzone-hint"
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepthRef.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setIsDragging(false);
        }}
        onDrop={(e) => {
          dragDepthRef.current = 0;
          setIsDragging(false);
          onDrop(e);
        }}
        className={`mt-8 flex w-full max-w-3xl flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-10 transition-all duration-200 ${
          isDragging
            ? "scale-[1.01] border-white bg-white/10"
            : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900"
        }`}
      >
        <div
          aria-hidden
          className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
            isDragging
              ? "bg-white text-black"
              : "bg-white/15 text-white"
          }`}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.7}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
            />
          </svg>
        </div>
        <div>
          <p
            id="pdf-dropzone-title"
            className="text-base font-semibold text-neutral-100"
          >
            {isDragging ? "Lepaskan file PDF di sini" : "Tarik file PDF ke sini"}
          </p>
          <p id="pdf-dropzone-hint" className="mt-1 text-sm text-neutral-500">
            atau pilih dari perangkat dengan tombol di bawah
          </p>
        </div>
        <button
          type="button"
          onClick={openFileDialog}
          className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
        >
          Pilih PDF
        </button>
      </div>

      <label htmlFor="pdf-file-input" className="sr-only">
        Pilih file PDF dari perangkat
      </label>
      <input
        id="pdf-file-input"
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        aria-label="Pilih file PDF dari perangkat"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {dragError && (
        <p
          role="alert"
          className="mt-3 w-full max-w-3xl rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300"
        >
          {dragError}
        </p>
      )}

      <p className="mt-3 text-xs text-neutral-500">
        Tip: salin file PDF lalu tempel dengan Ctrl+V
      </p>

      {/* Buka dari URL */}
      <div className="mt-3 w-full max-w-3xl">
        {showUrl ? (
          <form
            id="url-form"
            className="flex flex-col items-stretch gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-left"
            onSubmit={async (e) => {
              e.preventDefault();
              const trimmed = url.trim();
              if (!trimmed || isUrlLoading) return;
              setIsUrlLoading(true);
              try {
                await onSelectUrl(trimmed);
              } finally {
                setIsUrlLoading(false);
              }
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-400">
                URL file PDF
              </span>
              <input
                type="url"
                value={url}
                autoFocus
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://contoh.com/dokumen.pdf"
                className="w-full rounded-lg border border-neutral-700 bg-black px-3 py-2 text-sm text-neutral-100 outline-none transition-shadow placeholder:text-neutral-600 focus:border-white focus:ring-2 focus:ring-white/30"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!url.trim() || isUrlLoading}
                className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUrlLoading ? "Mengunduh..." : "Buka PDF"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUrl(false);
                  setUrl("");
                }}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
              >
                Batal
              </button>
            </div>
            <p className="text-xs leading-relaxed text-neutral-500">
              URL dengan CORS dimuat langsung dari browser. Jika tidak, diambil
              lewat server (maks ~4,5 MB).
            </p>
          </form>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowUrl(true)}
              aria-expanded={showUrl}
              aria-controls="url-form"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white transition-colors hover:text-neutral-300"
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
                  d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                />
              </svg>
              atau buka dari URL
            </button>
          </div>
        )}
      </div>

      {/* Cara kerja */}
      <section
        aria-labelledby="how-it-works"
        className="mt-12 w-full max-w-3xl"
      >
        <h2
          id="how-it-works"
          className="text-center text-sm font-semibold tracking-wide text-neutral-300 uppercase"
        >
          Cara kerja
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-left"
            >
              <span className="text-xs font-bold tracking-widest text-white">
                {s.n}
              </span>
              <p className="mt-1 text-sm font-semibold text-neutral-100">{s.t}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                {s.d}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Fitur unggulan */}
      <section aria-labelledby="features" className="mt-8 w-full max-w-3xl">
        <h2
          id="features"
          className="text-center text-sm font-semibold tracking-wide text-neutral-300 uppercase"
        >
          Fitur unggulan
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-left"
            >
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={f.icon}
                />
              </svg>
              <p className="mt-2 text-sm font-semibold text-neutral-100">
                {f.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-xs leading-relaxed text-neutral-600">
        PDF maks 25 MB · 100 halaman · .pdf — file perangkat tidak diunggah,
        kecuali via URL non-CORS.
      </p>
    </div>
  );
}
