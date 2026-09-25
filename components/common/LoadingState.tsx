export default function LoadingState({ message }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16 text-neutral-500"
      role="status"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-neutral-800 border-t-white" />
      <p className="text-sm">{message ?? "Sedang memproses..."}</p>
    </div>
  );
}