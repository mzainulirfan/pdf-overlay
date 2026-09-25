export default function SuccessMessage({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border border-neutral-700 bg-white/5 px-4 py-3 text-sm text-neutral-200"
      role="status"
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}