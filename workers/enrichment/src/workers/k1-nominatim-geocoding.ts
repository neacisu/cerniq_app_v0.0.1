import type { Processor } from "bullmq";
import { db, setSessionTenantId, silverCompanies, silverEnrichmentLog, sql } from "@cerniq/db";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import {
  callExternalApi,
  createQueue,
  validateJobData,
  withCognitiveSpan,
} from "@cerniq/worker-shared";
import { createJobLogger } from "../lib/job-logger.js";
import { z } from "zod";

const svcLog = createServiceLogger("k1-nominatim-geocoding", { etapa: "e1" });

export type GeocodingJobData = {
  tenantId: string;
  companyId: string;
  adresa?: string;
  localitate?: string;
  judet?: string;
  correlationId?: string;
};

const geocodingJobDataSchema = z.object({
  tenantId: z.uuid(),
  companyId: z.uuid(),
  adresa: z.string().trim().min(1).optional(),
  localitate: z.string().trim().min(1).optional(),
  judet: z.string().trim().min(1).optional(),
  correlationId: z.string().trim().min(1).optional(),
});

function determineAccuracy(
  placeRank: number | null,
): "street" | "locality" | "county" | "region" | "country" {
  if (!placeRank) return "country";
  if (placeRank >= 26) return "street";
  if (placeRank >= 22) return "locality";
  if (placeRank >= 16) return "county";
  if (placeRank >= 12) return "region";
  return "country";
}

export const nominatimGeocodingProcessor: Processor<GeocodingJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:geo:geocode-nominatim",
    async (_span) => {
      validateJobData(geocodingJobDataSchema, job.data, {
        queueName: "geo:geocode:nominatim",
        jobId: job.id,
      });
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "K1:nominatim-geocoding",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      let targetUrl = "";
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info(
          { tenantId: job.data.tenantId, companyId: job.data.companyId },
          "K1 Nominatim geocode",
        );

        const parts = [job.data.adresa, job.data.localitate, job.data.judet, "Romania"].filter(
          Boolean,
        );
        if (parts.length === 0) {
          log.info("skip", "Fără adresă", {
            scrapingResult: "skipped",
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "skipped", reason: "no_address" };
        }
        const query = parts.join(", ");

        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "1");
        url.searchParams.set("countrycodes", "ro");
        targetUrl = url.toString();

        const response = await callExternalApi("nominatim", () =>
          fetch(url.toString(), {
            method: "GET",
            headers: {
              Accept: "application/json",
              "User-Agent":
                process.env.NOMINATIM_USER_AGENT ?? "CerniqApp/1.0 (contact@cerniq.app)",
            },
            signal: AbortSignal.timeout(Number(process.env.NOMINATIM_TIMEOUT_MS ?? "20000")),
          }),
        );
        if (!response.ok) throw new Error(`Nominatim failed: ${response.status}`);
        const payload = (await response.json()) as Array<Record<string, unknown>>;
        if (!Array.isArray(payload) || payload.length === 0) {
          log.info("geo", "Nominatim fără rezultate", {
            targetUrl,
            scrapingResult: "not_found",
            httpStatus: response.status,
            latencyMs: Date.now() - startedAt,
          });
          return { ok: true, status: "not_found", source: "nominatim_geocoding" };
        }

        const first = payload[0];
        const latitude = Number(first.lat ?? Number.NaN);
        const longitude = Number(first.lon ?? Number.NaN);
        const placeRank = Number(first.place_rank ?? Number.NaN);
        const accuracy = determineAccuracy(Number.isFinite(placeRank) ? placeRank : null);

        await db
          .update(silverCompanies)
          .set({
            latitude: Number.isFinite(latitude) ? String(latitude) : undefined,
            longitude: Number.isFinite(longitude) ? String(longitude) : undefined,
            metadata: sql`jsonb_set(COALESCE(${silverCompanies.metadata}, '{}'::jsonb), '{geocoding}', ${JSON.stringify(
              {
                query,
                accuracy,
                result: first,
                geocodedAt: new Date().toISOString(),
              },
            )}::jsonb)`,
            lastEnrichedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        const zoneQueue = createQueue("geo:zones:postgis");
        await zoneQueue.add("zones", {
          tenantId: job.data.tenantId,
          companyId: job.data.companyId,
          latitude,
          longitude,
          correlationId: job.data.correlationId,
        });
        await zoneQueue.close();

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "nominatim_geocoding",
          operation: "geocode",
          requestPayload: { query },
          responsePayload: first,
          fieldsUpdated: ["latitude", "longitude", "locationGeography", "metadata"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        log.step("done", "Geocodare reușită", {
          targetUrl,
          scrapingResult: "ok",
          httpStatus: response.status,
          fieldsExtracted: { lat: latitude, lon: longitude, accuracy },
          latencyMs: Date.now() - startedAt,
        });
        return { ok: true, status: "success", latitude, longitude, accuracy };
      } catch (error) {
        log.error(
          "fatal",
          `Nominatim geocoding eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
              url: targetUrl || undefined,
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};
