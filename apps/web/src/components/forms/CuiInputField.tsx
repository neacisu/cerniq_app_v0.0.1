import { InputField } from "./InputField.js";

const controlDigits = [7, 5, 3, 2, 1, 7, 5, 3, 2];

function validateRomanianCui(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 10) return false;
  const body = digits.slice(0, -1).padStart(9, "0");
  const control = Number(digits.at(-1));
  const sum = body
    .split("")
    .map((d, i) => Number(d) * controlDigits[i])
    .reduce((acc, v) => acc + v, 0);
  let expected = (sum * 10) % 11;
  if (expected === 10) expected = 0;
  return expected === control;
}

type CuiInputFieldProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function CuiInputField({ value, onChange, required }: CuiInputFieldProps) {
  const isValid = value.trim() === "" ? true : validateRomanianCui(value);
  return (
    <InputField
      label="CUI"
      value={value}
      onChange={onChange}
      placeholder="RO12345678 sau 12345678"
      hint={isValid ? "Validare Modulo-11 activa" : "CUI invalid conform Modulo-11"}
      error={isValid ? undefined : "CUI invalid"}
      required={required}
    />
  );
}
