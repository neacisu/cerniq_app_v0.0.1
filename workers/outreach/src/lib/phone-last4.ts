/** Ultimele 4 cifre pentru loguri (PII redus). */
export function phoneLast4(phone: string): string {
  const d = phone.replaceAll(/\D/g, "");
  return d.length <= 4 ? d : d.slice(-4);
}
