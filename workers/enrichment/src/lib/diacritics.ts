const DIACRITICS_MAP: Record<string, string> = {
  ă: "a",
  â: "a",
  î: "i",
  ș: "s",
  ț: "t",
  Ă: "A",
  Â: "A",
  Î: "I",
  Ș: "S",
  Ț: "T",
  // Legacy cedilla variants (common in older Romanian data)
  ş: "s",
  ţ: "t",
  Ş: "S",
  Ţ: "T",
};

const DIACRITICS_REGEX = new RegExp(`[${Object.keys(DIACRITICS_MAP).join("")}]`, "g");

export function stripDiacritics(input: string): string {
  return input.replaceAll(DIACRITICS_REGEX, (char) => DIACRITICS_MAP[char] ?? char);
}
