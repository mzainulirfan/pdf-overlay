"use client";

type PdfNavigationProps = {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export default function PdfNavigation({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: PdfNavigationProps) {
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const navButton =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-slate-300 enabled:hover:bg-slate-50 enabled:focus:outline-none enabled:focus:ring-2 enabled:focus:ring-indigo-500";

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
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
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="min-w-28 select-none px-3 text-center text-sm font-medium text-slate-700">
        <span className="font-bold text-slate-900">{currentPage}</span>
        <span className="text-slate-400"> / {totalPages}</span>
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
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}