import { cn } from "@/lib/utils.js";

const VARS = [
  { key: "companyName", label: "Nume companie" },
  { key: "firstName", label: "Prenume" },
  { key: "lastName", label: "Nume" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefon" },
  { key: "city", label: "Localitate" },
  { key: "county", label: "Județ" },
  { key: "industry", label: "Industrie" },
  { key: "cui", label: "CUI" },
  { key: "website", label: "Website" },
] as const;

type VariableInserterProps = {
  readonly textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly className?: string;
};

/** Inserare {{variabile}} la poziția cursorului (spec etapa2-ui-pages §7). */
export function VariableInserter({
  textareaRef,
  value,
  onChange,
  className,
}: Readonly<VariableInserterProps>) {
  const insert = (key: string) => {
    const el = textareaRef.current;
    const token = `{{${key}}}`;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      <span className="text-[10px] text-t3 w-full mb-1">Variabile</span>
      {VARS.map((v) => (
        <button
          key={v.key}
          type="button"
          title={v.label}
          onClick={() => insert(v.key)}
          className="rounded border border-s600 bg-s800 px-1.5 py-0.5 text-[10px] text-t2 hover:border-b5 hover:text-t1"
        >
          {`{{${v.key}}}`}
        </button>
      ))}
    </div>
  );
}
