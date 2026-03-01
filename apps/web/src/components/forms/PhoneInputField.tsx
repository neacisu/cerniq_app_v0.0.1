import { InputField } from "./InputField.js";

function normalizeRoPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("40") && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length >= 10) return `+4${digits}`;
  if (digits.startsWith("7") && digits.length === 9) return `+40${digits}`;
  return value;
}

function isE164(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

type PhoneInputFieldProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function PhoneInputField({ value, onChange, required }: PhoneInputFieldProps) {
  const normalized = normalizeRoPhone(value);
  const valid = normalized.trim() === "" ? true : isE164(normalized);
  return (
    <InputField
      label="Telefon"
      value={value}
      onChange={(next) => onChange(normalizeRoPhone(next))}
      placeholder="+40722123456"
      hint={valid ? `E.164: ${normalized || "-"}` : "Format invalid E.164"}
      error={valid ? undefined : "Telefon invalid"}
      required={required}
      type="tel"
    />
  );
}
