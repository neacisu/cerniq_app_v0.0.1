import { Input } from "@/components/ui/input.js";
import { FormField } from "./FormField.js";

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "number";
};

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  required,
  type = "text",
}: InputFieldProps) {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  );
}
