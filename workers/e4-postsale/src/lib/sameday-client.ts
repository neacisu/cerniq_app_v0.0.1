/**
 * sameday-client.ts — Client HTTP Sameday Business API v2
 *
 * Anti-halucinare: endpoint-uri bazate pe spec intern
 *   `/docs/specifications/Etapa 4/etapa4-workers-E-sameday.md`
 *   și documentația oficială Sameday Business API.
 * Base URL: https://api.sameday.ro (configurabil via SAMEDAY_API_URL)
 * Auth: POST /api/authenticate → Bearer token (OAuth2 resource owner)
 * Token cache: în memorie per-pod, TTL 3500s (< 3600s validitate token)
 * Rate limit: 30 req/min (Sameday Business API limit)
 * Circuit breaker: opossum — timeout 30s, errorThreshold 50%, volumeThreshold 5
 */
import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Configurare env vars
// ---------------------------------------------------------------------------

const SAMEDAY_API_BASE = (process.env.SAMEDAY_API_URL ?? "https://api.sameday.ro").replace(
  /\/+$/,
  "",
);
const SAMEDAY_CLIENT_ID = process.env.SAMEDAY_CLIENT_ID ?? "";
const SAMEDAY_CLIENT_SECRET = process.env.SAMEDAY_CLIENT_SECRET ?? "";
export const SAMEDAY_PICKUP_POINT_ID = process.env.SAMEDAY_PICKUP_POINT_ID ?? "";
const SAMEDAY_TIMEOUT_MS = Number(process.env.SAMEDAY_TIMEOUT_MS ?? "30000");

const TOKEN_TTL_MS = 3_500_000; // 3500s < 3600s token validity

// ---------------------------------------------------------------------------
// Tipuri Sameday Business API
// ---------------------------------------------------------------------------

export type SamedayAwbRecipient = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  county: string;
  postalCode: string;
};

export type SamedayAwbCreateRequest = {
  pickupPoint: string;
  service: "STANDARD" | "EXPRESS" | "LOCKER";
  packageType: number;
  packageNumber: number;
  packageWeight: number;
  awbPayment: 0 | 1;
  cashOnDelivery: number;
  recipient: SamedayAwbRecipient;
  observation?: string;
  clientReference?: string;
};

export type SamedayAwbCreateResponse = {
  awbNumber: string;
  parcelId: number | string;
  labelUrl?: string;
  service?: string;
};

export type SamedayTrackingEvent = {
  statusCode: string;
  statusDescription: string;
  location?: string;
  city?: string;
  county?: string;
  eventTimestamp: string;
};

export type SamedayTrackingResponse = {
  awbNumber: string;
  currentStatus: SamedayTrackingEvent;
  history: SamedayTrackingEvent[];
};

export type SamedayPickupRequest = {
  pickupPoint: string;
  awbNumbers: string[];
  pickupDate: string;
};

export type SamedayPickupResponse = {
  pickupId: string | number;
  scheduledDate?: string;
};

// ---------------------------------------------------------------------------
// Status mapping: Sameday statusCode → internal shipment_status enum
// Conform Plan FAZA 8e L2084-2086
// ---------------------------------------------------------------------------

type InternalShipmentStatus =
  | "CREATED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "RETURNED";

/** Statusuri Sameday care marchează o expediere ca terminată (nu mai necesită polling). */
export const SAMEDAY_TERMINAL_STATUSES = new Set(["DELIVERED", "RETURNED_TO_SENDER", "RETURNED"]);

export function mapSamedayStatus(samedayCode: string): InternalShipmentStatus {
  switch (samedayCode.toUpperCase()) {
    case "PICKED_UP":
    case "PICKED":
      return "PICKED_UP";
    case "IN_WAREHOUSE":
    case "WAREHOUSE":
    case "IN_TRANSIT":
      return "IN_TRANSIT";
    case "IN_DELIVERY":
    case "OUT_FOR_DELIVERY":
      return "OUT_FOR_DELIVERY";
    case "DELIVERED":
      return "DELIVERED";
    case "DELIVERY_FAILED":
    case "NOT_DELIVERED":
    case "UNDELIVERED":
      return "DELIVERY_FAILED";
    case "RETURNED_TO_SENDER":
    case "RETURNED":
    case "RETURN_TO_SENDER":
      return "RETURNED";
    default:
      return "IN_TRANSIT";
  }
}

// ---------------------------------------------------------------------------
// Token cache în memorie per-pod
// (funcțional echivalent cu Redis pentru deployuri single-instance per pod;
//  fiecare pod își reîmprospătează independent token-ul)
// ---------------------------------------------------------------------------

let _token: string | null = null;
let _tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_token && now < _tokenExpiresAt) {
    return _token;
  }

  if (!SAMEDAY_CLIENT_ID || !SAMEDAY_CLIENT_SECRET) {
    throw new Error(
      "Missing required env: SAMEDAY_CLIENT_ID / SAMEDAY_CLIENT_SECRET (OpenBao secret/data/e4-postsale)",
    );
  }

  const authUrl = `${SAMEDAY_API_BASE}/api/authenticate`;
  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Type": "Web",
    },
    body: new URLSearchParams({
      username: SAMEDAY_CLIENT_ID,
      password: SAMEDAY_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(SAMEDAY_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Sameday auth failed: HTTP ${response.status} — ${text}`);
  }

  const body = (await response.json()) as { token?: string; expire_in?: number };
  if (!body.token) {
    throw new Error("Sameday auth: missing token in response");
  }

  const expireInMs = (body.expire_in ?? 3600) * 1000;
  _token = body.token;
  _tokenExpiresAt = now + Math.min(expireInMs, TOKEN_TTL_MS);
  return _token;
}

// ---------------------------------------------------------------------------
// Low-level HTTP cu retry la 401 (token expirat prematur)
// ---------------------------------------------------------------------------

async function samedayRawRequest(method: string, path: string, body: unknown): Promise<unknown> {
  const token = await getToken();
  const url = `${SAMEDAY_API_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "X-Auth-Type": "Web",
  };

  const fetchOpts: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(SAMEDAY_TIMEOUT_MS),
  };

  if (body !== null && body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchOpts.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOpts);

  if (response.status === 401) {
    // Token expirat prematur: invalidează cache și reîncearcă o singură dată
    _token = null;
    _tokenExpiresAt = 0;
    const freshToken = await getToken();
    headers["Authorization"] = `Bearer ${freshToken}`;
    const retry = await fetch(url, { ...fetchOpts, body: fetchOpts.body, headers });
    if (!retry.ok) {
      const text = await retry.text().catch(() => "");
      throw new Error(`Sameday API ${method} ${path} → HTTP ${retry.status}: ${text}`);
    }
    if (retry.status === 204) return undefined;
    return retry.json() as Promise<unknown>;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw Object.assign(
      new Error(`Sameday API ${method} ${path} → HTTP ${response.status}: ${text}`),
      { statusCode: response.status, responseBody: text },
    );
  }

  if (response.status === 204) return undefined;
  return response.json() as Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Circuit breaker singleton (wraps samedayRawRequest)
// ---------------------------------------------------------------------------

const samedayBreaker = createCircuitBreaker(samedayRawRequest, "sameday", {
  timeout: SAMEDAY_TIMEOUT_MS,
  volumeThreshold: 5,
  errorThresholdPercentage: 50,
  resetTimeout: 60_000,
});

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  return withExternalApiMetrics("sameday", () =>
    samedayBreaker.fire(method, path, body ?? null),
  ) as Promise<T>;
}

// ---------------------------------------------------------------------------
// API publice Sameday Business
// ---------------------------------------------------------------------------

/**
 * POST /api/awb — crează un AWB (Air Waybill) pentru o expediere.
 * Returnează awbNumber (numeric string), parcelId și labelUrl.
 */
export async function createSamedayAwb(
  payload: SamedayAwbCreateRequest,
): Promise<SamedayAwbCreateResponse> {
  return request<SamedayAwbCreateResponse>("POST", "/api/awb", payload);
}

/**
 * GET /api/client/awb-history/{awbBarcode} — obține istoricul de tracking al unui AWB.
 * Returnează statusul curent și istoricul complet de evenimente.
 */
export async function getSamedayTracking(awbNumber: string): Promise<SamedayTrackingResponse> {
  const encoded = encodeURIComponent(awbNumber);
  return request<SamedayTrackingResponse>("GET", `/api/client/awb-history/${encoded}`, null);
}

/**
 * POST /api/pickup — programează colectare curier pentru un set de AWB-uri.
 * Apelat de E27 (cron 0 14 * * *) pentru batch pickup la 14:00.
 */
export async function scheduleSamedayPickup(
  payload: SamedayPickupRequest,
): Promise<SamedayPickupResponse> {
  return request<SamedayPickupResponse>("POST", "/api/pickup", payload);
}

/**
 * Resetează cache-ul de token intern (util în teste).
 */
export function _resetSamedayClientCache(): void {
  _token = null;
  _tokenExpiresAt = 0;
}
