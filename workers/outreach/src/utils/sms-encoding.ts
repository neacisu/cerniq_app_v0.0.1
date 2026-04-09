/**
 * Estimare segmente SMS (GSM-7 vs UCS-2) — convenție Twilio/Vonage.
 * GSM-7: 160 caractere / 153 per segment în multipart.
 * UCS-2: 70 / 67.
 * Conservativ: orice caracter non-ASCII → UCS-2 (include emoji, diacritice extinse).
 */
function isGsm7BasicLatin(text: string): boolean {
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c > 127) return false;
  }
  return true;
}

/**
 * Returnează numărul de segmente (minim 1).
 */
export function estimateSmsSegments(text: string): { segments: number; encoding: "GSM7" | "UCS2" } {
  if (text.length === 0) {
    return { segments: 1, encoding: "GSM7" };
  }
  const gsm = isGsm7BasicLatin(text);
  if (gsm) {
    const len = text.length;
    if (len <= 160) return { segments: 1, encoding: "GSM7" };
    return { segments: Math.ceil(len / 153), encoding: "GSM7" };
  }
  const codepoints = [...text].length;
  if (codepoints <= 70) return { segments: 1, encoding: "UCS2" };
  return { segments: Math.ceil(codepoints / 67), encoding: "UCS2" };
}
