"use client";

import { useState } from "react";

type PdfNavigationProps = {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (page: number) => void;
};

export default function PdfNavigation({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onGoTo,
}: PdfNavigationProps) {
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;
  const [draft, setDraft] = useState<string | null>(null);

  const navButton =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition-all disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-slate-600 enabled:hover:bg-slate-800 enabled:focus:outline-none enabled:focus:ring-2 enabled:focus:ring-indigo-500";

  const commitJump = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    setDraft(null);
    if (Number.isFinite(parsed)) onGoTo(parsed);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900 p-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className={`${navButton} !rounded-full`}
        aria-label="Halaman sebelumnya"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="flex select-none items-center gap-1 px-2 text-center text-sm font-medium text-slate-300">
        <label htmlFor="page-jump-input" className="sr-only">
          Lompat ke halaman 1 sampai {totalPages}
        </label>
        <input
          id="page-jump-input"
          type="number"
          min={1}
          max={totalPages}
          value={draft ?? currentPage}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitJump}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setDraft(null);
          }}
          aria-label={`Halaman saat ini, ketik 1 sampai ${totalPages} lalu Enter`}
          className="h-7 w-12 rounded-md border border-transparent bg-transparent text-center text-sm font-bold text-slate-100 tabular-nums outline-none transition-colors hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-950 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-slate-500">/ {totalPages}</span>
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className={`${navButton} !rounded-full`}
        aria-label="Halaman berikutnya"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
