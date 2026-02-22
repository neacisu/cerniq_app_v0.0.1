import { Spinner } from "@/components/ui/spinner.js";

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-s950)]">
      <div className="flex flex-col items-center gap-4">
        <Spinner size={40} />
        <p className="text-sm text-[var(--color-t3)]">Loading...</p>
      </div>
    </div>
  );
}
