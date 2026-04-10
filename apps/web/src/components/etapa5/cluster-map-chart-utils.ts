import type { GeoSummaryRow } from "@/lib/etapa5-api.js";

export function parseGeoRowCoords(row: GeoSummaryRow): { lat: number; lng: number } | null {
  if (row.avgLatitude == null || row.avgLongitude == null) return null;
  const lat = Number(row.avgLatitude);
  const lng = Number(row.avgLongitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export type ClusterMapChartProps = {
  readonly rows: readonly GeoSummaryRow[];
  readonly height?: number;
  readonly onSelectRegion?: (row: GeoSummaryRow) => void;
};
