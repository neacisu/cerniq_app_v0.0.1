import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input.js";
import { Select } from "@/components/ui/select.js";

type Option = { label: string; value: string };

type SearchableSelectProps = {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Filtreaza optiuni...",
}: SearchableSelectProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );

  return (
    <div className="space-y-2">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder} />
      <Select
        options={filtered}
        value={value}
        onValueChange={onChange}
        placeholder="Selecteaza..."
      />
    </div>
  );
}
