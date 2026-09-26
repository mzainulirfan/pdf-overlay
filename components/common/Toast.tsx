type ToastType = "success" | "error" | "info";

export type ToastData = {
  id: number;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

const STYLES: Record<ToastType, string> = {
  success:
    "border-neutral-700 bg-black text-neutral-100 shadow-lg shadow-black/40",
  error: "border-red-500/20 bg-black text-red-200 shadow-lg shadow-black/40",
  info: "border-neutral-700 bg-black text-neutral-100 shadow-lg shadow-black/40",
};

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
    />
  ),
  error: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
    />
  ),
  info: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM12 7.5h.008v.008H12V7.5z"
    />
  ),
};

const ICON_COLORS: Record<ToastType, string> = {
  success: "bg-white text-black",
  error: "bg-red-100 text-red-600",
  info: "bg-white text-black",
};

export default function Toast({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4"
      role="region"
      aria-label="Notifikasi"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-toast-in flex items-center gap-3 rounded-xl border px-4 py-3 ${STYLES[t.type]}`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ICON_COLORS[t.type]}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {ICONS[t.type]}
            </svg>
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium">{t.message}</p>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action?.onClick();
                onDismiss(t.id);
              }}
              className="pointer-events-auto shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-300"
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}