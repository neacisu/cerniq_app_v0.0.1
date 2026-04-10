/**
 * Utilități pentru gauge-ul NPS (scală -100…+100).
 * Separate de `NpsGauge.tsx` pentru a respecta `react-refresh/only-export-components`.
 */

/** Mapare liniară din medie 0–10 către indice -100…+100 (proxy vizual; nu înlocuiește NPS clasic din sondaje). */
export function deriveNpsIndexFromAvg10(avg0to10: number): number {
  const c = Math.max(0, Math.min(10, avg0to10));
  return Math.round((c - 5) * 20);
}
