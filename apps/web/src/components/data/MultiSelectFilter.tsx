import { useMemo } from "react";
import { SearchableSelect } from "@/components/forms/SearchableSelect.js";

type MultiSelectFilterProps = {
  options: { label: string; value: string }[];
  values: string[];
  onChange: (values: string[]) => void;
};

export function MultiSelectFilter({ options, values, onChange }: MultiSelectFilterProps) {
  const selectedOptions = useMemo(
    () => options.filter((o) => values.includes(o.value)),
    [options, values],
  );
  return (
    <div className="space-y-2">
      <SearchableSelect
        options={options}
        onChange={(value) => {
          if (!value) return;
          if (!values.includes(value)) onChange([...values, value]);
        }}
      />
      <div className="flex flex-wrap gap-1">
        {selectedOptions.map((opt) => (
          <button
            key={opt.value}
            className="rounded bg-[var(--color-s700)] px-2 py-1 text-xs text-[var(--color-t2)]"
            onClick={() => onChange(values.filter((v) => v !== opt.value))}
          >
            {opt.label} x
          </button>
        ))}
      </div>
    </div>
  );
}
