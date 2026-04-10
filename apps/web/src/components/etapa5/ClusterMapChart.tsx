import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { GeoSummaryRow } from "@/lib/etapa5-api.js";
import { useIsClient } from "@/hooks/use-is-client.js";
import {
  parseGeoRowCoords,
  type ClusterMapChartProps,
} from "@/components/etapa5/cluster-map-chart-utils.js";
import "leaflet/dist/leaflet.css";

type PlotRow = GeoSummaryRow & { lat: number; lng: number };

function FitOnReady({ rows }: { readonly rows: readonly PlotRow[] }) {
  const map = useMap();
  useEffect(() => {
    if (rows.length === 0) return;
    if (rows.length === 1) {
      map.setView([rows[0].lat, rows[0].lng], 8);
      return;
    }
    const b = L.latLngBounds(rows.map((r) => [r.lat, r.lng]));
    map.fitBounds(b.pad(0.12));
  }, [map, rows]);
  return null;
}

/** Marker + heat halo: zoom la click și deschidere popup (detaliu în părinte prin `onSelectRegion`). */
function DensityMarker({
  row,
  maxCount,
  onSelectRegion,
}: {
  readonly row: PlotRow;
  readonly maxCount: number;
  readonly onSelectRegion?: (row: GeoSummaryRow) => void;
}) {
  const map = useMap();
  const intensity = maxCount > 0 ? row.companyCount / maxCount : 0;
  const radius = 12 + Math.round(26 * intensity);
  const heatRadius = radius * 2.2;

  return (
    <>
      <CircleMarker
        center={[row.lat, row.lng]}
        pathOptions={{
          fillColor: "#2563eb",
          fillOpacity: 0.06 + intensity * 0.12,
          stroke: false,
        }}
        radius={heatRadius}
      />
      <CircleMarker
        center={[row.lat, row.lng]}
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#2563eb",
          fillOpacity: 0.28 + intensity * 0.5,
          weight: 2,
        }}
        radius={radius}
        eventHandlers={{
          click: () => {
            const z = Math.min(Math.max(map.getZoom() + 1, 7), 12);
            map.flyTo([row.lat, row.lng], z);
            onSelectRegion?.(row);
          },
        }}
      >
        <Popup>
          <div className="text-xs">
            <strong>{row.regionLabel}</strong>
            <div>{row.companyCount} companii (agregat regiune)</div>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

/** Hartă Leaflet: „clustere” = regiuni cu coordonate medii + halo densitate. */
export function ClusterMapChart({ rows, height = 360, onSelectRegion }: ClusterMapChartProps) {
  const isClient = useIsClient();

  const plotRows = useMemo(() => {
    const out: PlotRow[] = [];
    for (const r of rows) {
      const c = parseGeoRowCoords(r);
      if (!c) continue;
      out.push({ ...r, ...c });
    }
    return out;
  }, [rows]);

  const maxCount = useMemo(
    () => (plotRows.length === 0 ? 1 : Math.max(...plotRows.map((p) => p.companyCount), 1)),
    [plotRows],
  );

  const defaultCenter: [number, number] = [45.9432, 24.9668];
  const defaultZoom = plotRows.length === 0 ? 6 : 7;

  if (!isClient) {
    return (
      <div
        className="rounded-lg border border-s700 bg-s800 flex items-center justify-center text-sm text-t3"
        style={{ height }}
      >
        Se încarcă harta…
      </div>
    );
  }

  if (plotRows.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-s600 bg-s800/50 flex items-center justify-center text-sm text-t3 px-4 text-center"
        style={{ height }}
      >
        Nu există coordonate medii (avgLatitude / avgLongitude) în geo-summary — harta Leaflet
        necesită valori numerice.
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-s700" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitOnReady rows={plotRows} />
        {plotRows.map((row) => (
          <DensityMarker
            key={row.regionLabel}
            row={row}
            maxCount={maxCount}
            onSelectRegion={onSelectRegion}
          />
        ))}
      </MapContainer>
    </div>
  );
}
