import { Select, type SelectOption } from "@/components/ui/select.js";
import { FormField } from "./FormField.js";

type SelectFieldProps = {
  label: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
};

export function SelectField({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  required,
}: SelectFieldProps) {
  return (
    <FormField label={label} error={error} hint={hint} required={required}>
      <Select options={options} value={value} onValueChange={onChange} error={Boolean(error)} />
    </FormField>
  );
}
