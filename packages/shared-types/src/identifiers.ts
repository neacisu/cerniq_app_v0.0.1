import { z } from "zod";

const OLD_NR_REG_COM_RE = /^([JFC])(\d{1,2})\/(\d+)\/(\d{4})$/i;
const NEW_NR_REG_COM_RE = /^([JFC])(\d{4})(\d{6})(\d{2})(\d)$/i;
const NON_DIGIT_RE = /\D/g;
const WHITESPACE_RE = /\s+/g;

function normalizeIdentifierWhitespace(input: string) {
  return input.trim().toUpperCase().replaceAll(WHITESPACE_RE, "");
}

export function sanitizeCui(input: string): string {
  const normalized = input.toUpperCase().trim();
  const withoutPrefix = normalized.startsWith("RO") ? normalized.slice(2) : normalized;
  return withoutPrefix.replaceAll(NON_DIGIT_RE, "");
}

export function isValidCUI(input: string): boolean {
  const clean = sanitizeCui(input);
  if (clean.length < 2 || clean.length > 10 || !/^\d+$/.test(clean)) return false;

  const padded = clean.padStart(10, "0");
  const digits = padded.split("").map(Number);
  const checkDigit = digits.pop();
  if (checkDigit == null) return false;

  const controlKey = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  let sum = 0;
  for (let i = 0; i < controlKey.length; i++) {
    sum += (digits[i] ?? 0) * controlKey[i];
  }
  const remainder = (sum * 10) % 11;
  const expected = remainder === 10 ? 0 : remainder;
  return checkDigit === expected;
}

export function computeNrRegComCheckDigit(base: string): number {
  const normalized = normalizeIdentifierWhitespace(base);
  if (!/^([JFC])(\d{4})(\d{6})(\d{2})$/.test(normalized)) {
    throw new Error("Invalid base for NrRegCom check digit");
  }

  const type = normalized[0];
  const rest = normalized.slice(1);
  const sumDigits = rest.split("").reduce((acc, ch) => acc + Number(ch), 0);
  return ((type.codePointAt(0) ?? 0) + sumDigits) % 10;
}

export function convertOldNrRegComToCanonical(
  type: string,
  county: string,
  order: string,
  year: string,
): string {
  const t = type.toUpperCase();
  const y = year.padStart(4, "0");
  const ord = order.padStart(6, "0");
  const jj = county.padStart(2, "0");
  const base = `${t}${y}${ord}${jj}`;
  const check = computeNrRegComCheckDigit(base);
  return `${base}${check}`;
}

/**
 * Normalize and VALIDATE a NrRegCom without converting old format to new.
 * Old format (J09/98/2003) is returned as-is (uppercased).
 * New format (J2003000098095) is validated via check digit and returned as-is.
 * Invalid input returns null.
 *
 * Use this for storing values from non-authoritative sources (CSV, Excel imports).
 */
export function sanitizeNrRegCom(input: string): string | null {
  const raw = normalizeIdentifierWhitespace(input);
  if (!raw) return null;

  if (NEW_NR_REG_COM_RE.test(raw)) {
    const newMatch = NEW_NR_REG_COM_RE.exec(raw);
    if (!newMatch) return null;
    const [, type, year, order, county, checkDigit] = newMatch;
    const base = `${type}${year}${order}${county}`;
    const expected = computeNrRegComCheckDigit(base);
    return expected === Number(checkDigit) ? raw : null;
  }

  if (OLD_NR_REG_COM_RE.test(raw)) {
    return raw; // valid old format — preserve as-is, do NOT convert to canonical
  }

  return null;
}

/**
 * Convert NrRegCom to the new canonical format (J2003000098095).
 * Old format is converted; new format is validated and returned as-is.
 * Returns null for invalid input.
 *
 * Only use this when producing canonical keys for identity matching,
 * or when processing data from authoritative official sources (ONRC).
 */
export function normalizeNrRegCom(input: string): string | null {
  const raw = normalizeIdentifierWhitespace(input);
  if (!raw) return null;

  const newMatch = NEW_NR_REG_COM_RE.exec(raw);
  if (newMatch) {
    const [, type, year, order, county, checkDigit] = newMatch;
    const base = `${type}${year}${order}${county}`;
    const expected = computeNrRegComCheckDigit(base);
    return expected === Number(checkDigit) ? raw : null;
  }

  const oldMatch = OLD_NR_REG_COM_RE.exec(raw);
  if (!oldMatch) return null;
  const [, type, county, order, year] = oldMatch;
  return convertOldNrRegComToCanonical(type, county, order, year);
}

export function isValidNrRegCom(input: string): boolean {
  return normalizeNrRegCom(input) !== null;
}

export const cuiSchema = z
  .string()
  .trim()
  .refine((value) => sanitizeCui(value).length > 0, "CUI is required")
  .refine((value) => /^\d{2,10}$/.test(sanitizeCui(value)), "CUI invalid")
  .transform((value) => sanitizeCui(value));

export const nrRegComSchema = z
  .string()
  .trim()
  .refine((value) => normalizeNrRegCom(value) !== null, "Format Nr. Reg. Com. invalid")
  .transform((value) => normalizeNrRegCom(value) as string);
