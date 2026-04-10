import { toast } from "sonner";
import type { NurturingStateListRow } from "@/lib/etapa5-api.js";

export function formatMoneyEur(value: string | undefined): string {
  const n = Number(value);
  if (Number.isNaN(n)) return value?.trim() || "—";
  if (n >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `€ ${(n / 1000).toFixed(1)}K`;
  return `€ ${n.toFixed(0)}`;
}

export function npsDisplay(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return String(score);
}

export function npsColorClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-t3";
  if (score >= 8) return "text-ok";
  if (score >= 5) return "text-wa";
  return "text-er";
}

export function handleNurturingTableMessage(company: string): void {
  toast.info(
    `Deschideți conversația din modulul de mesagerie pentru ${company} (nu este cablat aici).`,
  );
}

export function nextContactLabel(r: NurturingStateListRow): string {
  if (r.currentState === "AT_RISK") return "Prioritar";
  if (r.currentState === "CHURNED") return "—";
  return r.lastInteractionAt?.slice(0, 10) ?? "—";
}
