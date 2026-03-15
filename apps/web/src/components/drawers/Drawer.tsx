import { useEffect, type ReactNode } from "react";

type DrawerProps = Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}>;

export function Drawer({ open, onClose, title, subtitle, children }: DrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop — aria-hidden since keyboard users can press Escape */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Panel */}
      <aside className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-s900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-s700 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-t1">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-t3">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 shrink-0 rounded p-1 text-t3 hover:bg-s700 hover:text-t1"
            aria-label="Inchide"
          >
            ✕
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}
