export type ViolationDayPoint = { day: string; count: number };

/** Completează ultimele 7 zile cu zero dacă API-ul returnează doar zile cu evenimente. */
export function fillLast7Days(
  points: readonly ViolationDayPoint[],
): { label: string; value: number }[] {
  const byDay = new Map(points.map((p) => [p.day, p.count]));
  const out: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      label: d.toLocaleDateString("ro-RO", { weekday: "short", day: "2-digit", month: "short" }),
      value: byDay.get(key) ?? 0,
    });
  }
  return out;
}
