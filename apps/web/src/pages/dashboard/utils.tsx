import type { DashboardActivityItem } from "@/lib/etapa1-api.js";

export function getActivityStatus(item: DashboardActivityItem): "error" | "warning" | "info" {
  const severity = (item.severity ?? "").toLowerCase();
  if (severity.includes("critical") || severity.includes("error")) return "error";
  if (item.type.includes("approval")) return "warning";
  return "info";
}

export function sectionError(message: string) {
  return (
    <p className="text-sm text-t3 py-3" role="alert">
      {message}
    </p>
  );
}

/** Mesaj pentru erori din UseQuery, cu fallback contextual (ex. „Eroare contracte”). */
export function queryErrorDetail(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Varianta standard pentru carduri API (`Eroare API`). */
export function queryErrorMessage(error: unknown): string {
  return queryErrorDetail(error, "Eroare API");
}
