/**
 * postgis-proximity.ts — Wrapper PostGIS GEOGRAPHY pentru E5 Proximity Workers
 * Anti-halucin. FAZA 9d:
 *   (A) GEOGRAPHY type — ST_Distance returnează METRI (nu grade)
 *   (B) SRID 4326 (WGS84) — coordonate GPS standard
 *   (C) ST_DWithin pe GEOGRAPHY deja indexabil cu GIST — fără index redundant
 *   (D) KNN: ORDER BY <-> (nu ORDER BY ST_Distance LIMIT N)
 *   (E) Proximity score formula EXACT din plan §X L2282-2284
 *   (F) Refolosește gold_companies.location_geography din E1 geocoding — fără pipeline nou
 */

import { db, sql } from "@cerniq/db";

// ---------------------------------------------------------------------------
// Proximity Score Formula (Plan §X L2282-2284) — EXACT, fără factori adiționale
// ---------------------------------------------------------------------------

export const DEFAULT_RADIUS_METERS = 50_000; // 50km
export const NEIGHBOR_THRESHOLD = 0.6; // C16: score >= 0.6 → NEIGHBOR
const MAX_NEARBY_RESULTS = 50;
const MAX_ANCHOR_REVENUE = 10_000_000; // 10M RON cap pentru normalizare

/**
 * distanceScore = max(0, 1 - distance_meters / radius_meters)
 */
export function calcDistanceScore(distanceMeters: number, radiusMeters: number): number {
  return Math.max(0, 1 - distanceMeters / radiusMeters);
}

/**
 * anchorQuality = min(1, cifraAfaceri / MAX_ANCHOR_REVENUE)
 * normalizedRevenue per anchor (0-1)
 */
export function calcAnchorQuality(cifraAfaceri: number | null): number {
  if (!cifraAfaceri || cifraAfaceri <= 0) return 0;
  return Math.min(1, cifraAfaceri / MAX_ANCHOR_REVENUE);
}

/**
 * sharedBonus = ((sameCounty ? 10 : 0) + (sameCrop ? 10 : 0)) / 20
 * +10 SAME_COUNTY, +10 SAME_CROP, normalized to 0-1
 */
export function calcSharedBonus(sameCounty: boolean, sameCrop: boolean): number {
  return ((sameCounty ? 10 : 0) + (sameCrop ? 10 : 0)) / 20;
}

/**
 * proximityScore = distanceScore × 0.5 + anchorQuality × 0.3 + sharedBonus × 0.2
 * Formula EXACTĂ din Plan §X L2282-2284 — NU se adaugă factori noi.
 */
export function calcProximityScore(
  distanceScore: number,
  anchorQuality: number,
  sharedBonus: number,
): number {
  return distanceScore * 0.5 + anchorQuality * 0.3 + sharedBonus * 0.2;
}

// ---------------------------------------------------------------------------
// Tipuri de date
// ---------------------------------------------------------------------------

export interface NearbyClientRow {
  id: string;
  denumire: string | null;
  cifraAfaceri: string | null;
  judetCod: string | null;
  culturiPrincipale: unknown;
  distanceMeters: number;
}

export interface ConvexHullResult {
  geoJson: string | null;
  centroidLon: number | null;
  centroidLat: number | null;
  radiusKm: number | null;
}

export interface CountyCoverageRow {
  judetCod: string;
  clientCount: number;
  totalRevenue: number;
}

export interface CatchmentAssignment {
  prospectClientId: string;
  nearestAnchorId: string;
  distanceMeters: number;
}

// ---------------------------------------------------------------------------
// C15: findNearbyClients — ST_DWithin + KNN <-> order (Plan §X L2272-2284)
// Anti-halucin. (D): ORDER BY location_geography <-> anchor (KNN), NU ORDER BY ST_Distance
// ---------------------------------------------------------------------------

export async function findNearbyClients(params: {
  tenantId: string;
  anchorClientId: string;
  radiusMeters?: number;
}): Promise<NearbyClientRow[]> {
  const radius = params.radiusMeters ?? DEFAULT_RADIUS_METERS;

  const rows = await db.execute<{
    id: string;
    denumire: string | null;
    cifra_afaceri: string | null;
    judet_cod: string | null;
    culturi_principale: unknown;
    distance_meters: string;
  }>(sql`
    SELECT
      p.id,
      p.denumire,
      p.cifra_afaceri,
      p.judet_cod,
      p.culturi_principale,
      ST_Distance(
        a.location_geography::geography,
        p.location_geography::geography
      ) AS distance_meters
    FROM gold.gold_companies a
    CROSS JOIN gold.gold_companies p
    WHERE a.id = ${params.anchorClientId}::uuid
      AND p.tenant_id = ${params.tenantId}::uuid
      AND p.id != a.id
      AND p.location_geography IS NOT NULL
      AND a.location_geography IS NOT NULL
      AND ST_DWithin(
        a.location_geography::geography,
        p.location_geography::geography,
        ${radius}
      )
    ORDER BY a.location_geography <-> p.location_geography
    LIMIT ${MAX_NEARBY_RESULTS}
  `);

  const arr = Array.isArray(rows) ? rows : [];
  return arr.map((r) => ({
    id: r.id,
    denumire: r.denumire,
    cifraAfaceri: r.cifra_afaceri,
    judetCod: r.judet_cod,
    culturiPrincipale: r.culturi_principale,
    distanceMeters: Number(r.distance_meters),
  }));
}

// ---------------------------------------------------------------------------
// C15: fetchAnchorData — date client ancoră (revenue, judet, culturi)
// ---------------------------------------------------------------------------

export async function fetchAnchorData(anchorClientId: string): Promise<{
  cifraAfaceri: string | null;
  judetCod: string | null;
  culturiPrincipale: unknown;
} | null> {
  const [row] = await db.execute<{
    cifra_afaceri: string | null;
    judet_cod: string | null;
    culturi_principale: unknown;
  }>(sql`
    SELECT cifra_afaceri, judet_cod, culturi_principale
    FROM gold.gold_companies
    WHERE id = ${anchorClientId}::uuid
    LIMIT 1
  `);
  if (!row) return null;
  return {
    cifraAfaceri: row.cifra_afaceri,
    judetCod: row.judet_cod,
    culturiPrincipale: row.culturi_principale,
  };
}

// ---------------------------------------------------------------------------
// hasCropOverlap — verificare culturi comune
// ---------------------------------------------------------------------------

export function hasCropOverlap(anchorCrops: unknown, prospectCrops: unknown): boolean {
  if (!Array.isArray(anchorCrops) || !Array.isArray(prospectCrops)) return false;
  const anchorSet = new Set(anchorCrops.map((c) => String(c).toLowerCase().trim()));
  return prospectCrops.some((c) => anchorSet.has(String(c).toLowerCase().trim()));
}

// ---------------------------------------------------------------------------
// C17: getConvexHullForCluster — ST_ConvexHull(ST_Collect(location::geometry))
// Plan §X: UPDATE gold_clusters SET territory_polygon, center_point, radius_km
// ---------------------------------------------------------------------------

export async function getConvexHullForCluster(clientIds: string[]): Promise<ConvexHullResult> {
  if (clientIds.length === 0) {
    return { geoJson: null, centroidLon: null, centroidLat: null, radiusKm: null };
  }

  const idsLiteral = clientIds.map((id) => `'${id}'::uuid`).join(", ");

  const [row] = await db.execute<{
    geojson: string | null;
    centroid_lon: string | null;
    centroid_lat: string | null;
    radius_km: string | null;
  }>(
    sql.raw(`
    SELECT
      ST_AsGeoJSON(
        ST_ConvexHull(ST_Collect(location_geography::geometry))
      ) AS geojson,
      ST_X(ST_Centroid(ST_Collect(location_geography::geometry))) AS centroid_lon,
      ST_Y(ST_Centroid(ST_Collect(location_geography::geometry))) AS centroid_lat,
      (
        MAX(ST_Distance(
          ST_Centroid(ST_Collect(location_geography::geometry))::geography,
          location_geography::geography
        )) / 1000.0
      ) AS radius_km
    FROM gold.gold_companies
    WHERE id IN (${idsLiteral})
      AND location_geography IS NOT NULL
  `),
  );

  if (!row) return { geoJson: null, centroidLon: null, centroidLat: null, radiusKm: null };
  return {
    geoJson: row.geojson,
    centroidLon: row.centroid_lon === null ? null : Number(row.centroid_lon),
    centroidLat: row.centroid_lat === null ? null : Number(row.centroid_lat),
    radiusKm: row.radius_km === null ? null : Number(row.radius_km),
  };
}

// ---------------------------------------------------------------------------
// C18: getCountyCoverage — heatmap densitate per județ
// ---------------------------------------------------------------------------

export async function getCountyCoverage(tenantId: string): Promise<CountyCoverageRow[]> {
  const rows = await db.execute<{
    judet_cod: string;
    client_count: string;
    total_revenue: string;
  }>(sql`
    SELECT
      judet_cod,
      COUNT(*) AS client_count,
      COALESCE(SUM(cifra_afaceri::numeric), 0) AS total_revenue
    FROM gold.gold_companies
    WHERE tenant_id = ${tenantId}::uuid
      AND judet_cod IS NOT NULL
    GROUP BY judet_cod
    ORDER BY client_count DESC
  `);

  return (Array.isArray(rows) ? rows : []).map((r) => ({
    judetCod: r.judet_cod,
    clientCount: Number(r.client_count),
    totalRevenue: Number(r.total_revenue),
  }));
}

// ---------------------------------------------------------------------------
// C19: buildCatchmentZones — Nearest-anchor assignment (Voronoi-like)
// Per fiecare prospect: găsește cel mai aproape anchor din setul dat
// ---------------------------------------------------------------------------

export async function buildCatchmentZones(params: {
  tenantId: string;
  anchorClientIds: string[];
  prospectClientIds: string[];
}): Promise<CatchmentAssignment[]> {
  const { tenantId, anchorClientIds, prospectClientIds } = params;
  if (anchorClientIds.length === 0 || prospectClientIds.length === 0) return [];

  const anchorList = anchorClientIds.map((id) => `'${id}'::uuid`).join(", ");
  const prospectList = prospectClientIds.map((id) => `'${id}'::uuid`).join(", ");

  const rows = await db.execute<{
    prospect_id: string;
    nearest_anchor_id: string;
    distance_meters: string;
  }>(
    sql.raw(`
    SELECT DISTINCT ON (p.id)
      p.id AS prospect_id,
      a.id AS nearest_anchor_id,
      ST_Distance(
        a.location_geography::geography,
        p.location_geography::geography
      ) AS distance_meters
    FROM gold.gold_companies p
    CROSS JOIN gold.gold_companies a
    WHERE p.id IN (${prospectList})
      AND a.id IN (${anchorList})
      AND p.tenant_id = '${tenantId}'::uuid
      AND p.location_geography IS NOT NULL
      AND a.location_geography IS NOT NULL
    ORDER BY p.id, a.location_geography <-> p.location_geography
  `),
  );

  return (Array.isArray(rows) ? rows : []).map((r) => ({
    prospectClientId: r.prospect_id,
    nearestAnchorId: r.nearest_anchor_id,
    distanceMeters: Number(r.distance_meters),
  }));
}

// ---------------------------------------------------------------------------
// validatePostGISExtension — verificare PostGIS disponibil (Plan §X error handling)
// ---------------------------------------------------------------------------

export async function validatePostGISExtension(): Promise<void> {
  const rows = await db.execute<{ extname: string }>(sql`
    SELECT extname FROM pg_extension WHERE extname = 'postgis'
  `);
  const arr = Array.isArray(rows) ? rows : [];
  if (arr.length === 0) {
    throw new Error(
      "[postgis-proximity] PostGIS extension NOT installed. " +
        "Run: CREATE EXTENSION IF NOT EXISTS postgis; in the database.",
    );
  }
}
