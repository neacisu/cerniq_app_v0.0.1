import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input.js";

type CommandItem = { readonly label: string; readonly path: string; readonly keywords?: string[] };

type CommandPaletteProps = {
  readonly commands: readonly CommandItem[];
};

export function CommandPalette({ commands }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return commands.filter((cmd) => {
      const haystack = `${cmd.label} ${(cmd.keywords ?? []).join(" ")}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [commands, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-black/40 p-4 pt-[8vh]">
      <div className="w-full max-w-2xl rounded-lg border border-s600 bg-s900 p-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Navigheaza rapid..."
        />
        <div className="mt-3 max-h-[50vh] space-y-1 overflow-auto">
          {filtered.map((cmd) => (
            <button
              key={cmd.path}
              className="w-full rounded p-2 text-left text-sm text-t2 hover:bg-s800"
              onClick={() => {
                navigate(cmd.path);
                setOpen(false);
              }}
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
