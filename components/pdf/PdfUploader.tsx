"use client";

import { useCallback, useRef, useState } from "react";

type PdfUploaderProps = {
  onSelect: (file: File) => void;
  onSelectUrl: (url: string) => Promise<void> | void;
};

const FEATURES = [
  {
    title: "Tanpa Upload",
    desc: "File diproses langsung di browser.",
  },
  {
    title: "Satu Klik",
    desc: "Overlay diterapkan ke semua halaman.",
  },
  {
    title: "Privat",
    desc: "Dokumen tidak pernah meninggalkan perangkat.",
  },
];

export default function PdfUploader({ onSelect, onSelectUrl }: PdfUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [url, setUrl] = useState("");
  const [isUrlLoading, setIsUrlLoading] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
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
    <div className="flex flex-col items-center text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
        Editor Overlay PDF
      </div>

      <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Beri tanda <span className="text-indigo-600">FRAGILE</span> ke seluruh
        halaman PDF
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-500">
        Buka PDF, atur posisi overlay dengan drag-and-drop, lalu simpan atau
        cetak menjadi file baru. Mudah, cepat, tanpa software tambahan.
      </p>

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Tarik file PDF ke sini atau pilih dari perangkat"        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`group mt-10 flex w-full max-w-xl cursor-pointer flex-col items-center gap-5 rounded-2xl border-2 border-dashed px-8 py-16 transition-all duration-200 ${
          isDragging
            ? "scale-[1.02] border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100"
            : "border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50 hover:shadow-md hover:shadow-slate-200/60"
        }`}
      >
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
            isDragging
              ? "bg-indigo-500 text-white"
              : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
          }`}
        >
          <svg
            className="h-8 w-8"
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
          <p className="text-lg font-semibold text-slate-800">
            {isDragging
              ? "Lepaskan file PDF di sini"
              : "Tarik file PDF ke sini"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            atau{" "}
            <span className="font-medium text-indigo-600">pilih dari perangkat</span>
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Pilih PDF
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {dragError && (
        <p className="mt-4 text-sm text-red-600">{dragError}</p>
      )}

      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400">
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 7h11M9 11h8M7 15h10m-7 4h4"
          />
        </svg>
        Tip: salin file PDF lalu tempel langsung dengan Ctrl+V
      </p>

      {/* Buka dari URL */}
      <div className="mt-4 w-full max-w-xl">
        {showUrl ? (
          <form
            className="flex flex-col items-stretch gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm"
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
              <span className="text-xs font-medium text-slate-600">
                URL file PDF
              </span>
              <input
                type="url"
                value={url}
                autoFocus
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://contoh.com/dokumen.pdf"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!url.trim() || isUrlLoading}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUrlLoading ? "Mengunduh..." : "Buka PDF"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUrl(false);
                  setUrl("");
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              URL yang mengizinkan CORS dimuat langsung dari browser. Selain
              itu, file diambil lewat server aplikasi (maksimal ~4,5 MB).
            </p>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowUrl(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
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
                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
              />
            </svg>
            atau buka dari URL
          </button>
        )}
      </div>

      {/* Feature list */}
      <div className="mt-12 grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-800">{f.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-400">
        PDF maksimal 25 MB · hingga 100 halaman · format .pdf
      </p>
    </div>
  );
}