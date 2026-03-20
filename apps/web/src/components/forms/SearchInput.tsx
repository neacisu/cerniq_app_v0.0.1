import { Input } from "@/components/ui/input.js";

type SearchInputProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}>;

export function SearchInput({ value, onChange, placeholder = "Cauta..." }: SearchInputProps) {
  return (
    <Input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-sm"
    />
  );
}
