const CONTROL_KEY = [7, 5, 3, 2, 1, 7, 5, 3, 2] as const;

export function sanitizeCui(cui: string): string {
  return cui.toUpperCase().trim().replace(/^RO/, "").replace(/\D/g, "");
}

export function validateCuiChecksum(cleanCui: string): {
  isValid: boolean;
  checkDigit: number;
  expectedCheckDigit: number;
} {
  const paddedCui = cleanCui.padStart(10, "0");
  const digits = paddedCui.split("").map(Number);
  const checkDigit = digits.pop() ?? -1;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * CONTROL_KEY[i];
  }

  const remainder = (sum * 10) % 11;
  const expectedCheckDigit = remainder === 10 ? 0 : remainder;

  return {
    isValid: checkDigit === expectedCheckDigit,
    checkDigit,
    expectedCheckDigit,
  };
}

export function validateCuiModulo11(cui: string): {
  isValid: boolean;
  cleaned: string;
  reason: "invalid_length" | "non_numeric" | "checksum_mismatch" | null;
  checkDigit: number | null;
  expectedCheckDigit: number | null;
} {
  const cleaned = sanitizeCui(cui);

  if (cleaned.length < 2 || cleaned.length > 10) {
    return {
      isValid: false,
      cleaned,
      reason: "invalid_length",
      checkDigit: null,
      expectedCheckDigit: null,
    };
  }

  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      cleaned,
      reason: "non_numeric",
      checkDigit: null,
      expectedCheckDigit: null,
    };
  }

  const checksum = validateCuiChecksum(cleaned);
  return {
    isValid: checksum.isValid,
    cleaned,
    reason: checksum.isValid ? null : "checksum_mismatch",
    checkDigit: checksum.checkDigit,
    expectedCheckDigit: checksum.expectedCheckDigit,
  };
}
