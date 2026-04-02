/**
 * revolut-client.ts — Client HTTP Revolut Business API v1
 *
 * Anti-halucinare: endpoint-uri verificate în documentația oficială Revolut Business API.
 * Base URL prod: https://b2b.revolut.com/api/1.0
 * Base URL sandbox: https://sandbox-b2b.revolut.com/api/1.0
 * Auth: Bearer token (REVOLUT_API_TOKEN din OpenBao via loadSecretsFromFile)
 * Circuit breaker: opossum (timeout: 10s, volumeThreshold: 5, errorThreshold: 50%)
 * Rate limit: 100 req/min (Revolut Business API limit) — gestionat la nivel BullMQ queue
 */
import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";

const REVOLUT_API_BASE_PROD = "https://b2b.revolut.com/api/1.0";
const REVOLUT_API_BASE_SANDBOX = "https://sandbox-b2b.revolut.com/api/1.0";
const REVOLUT_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Tipuri Revolut Business API v1
// ---------------------------------------------------------------------------

export type RevolutAccount = {
  id: string;
  name: string;
  balance: number;
  currency: string;
  state: "active" | "inactive";
  updated_at: string;
  public_id: string;
};

export type RevolutTransaction = {
  id: string;
  type: string;
  state: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
  reference?: string;
  amount: number;
  fee: number;
  currency: string;
  counterparty?: {
    id?: string;
    name?: string;
    account_id?: string;
    account_type?: string;
    iban?: string;
  };
  legs?: Array<{
    amount: number;
    bill_amount?: number;
    bill_currency?: string;
    currency: string;
    description?: string;
  }>;
};

/**
 * POST /pay — creează un transfer/plată către un counterparty.
 * Folosit și pentru rambursări (plată inversă către clientul original).
 * Câmpuri conform documentației oficiale Revolut Business API.
 */
export type RevolutPaymentRequest = {
  /** UUID v4 unic per tranzacție — idempotency Revolut (valabil 2 săptămâni) */
  request_id: string;
  /** ID-ul contului Revolut Business de unde se face plata */
  account_id: string;
  receiver: {
    /** ID-ul counterparty-ului destinatar */
    counterparty_id: string;
    /** ID-ul contului destinatar (obligatoriu dacă counterparty are mai multe conturi) */
    account_id?: string;
  };
  /** Suma de plătit (pozitivă) */
  amount: number;
  /** Cod ISO 4217 valută */
  currency: string;
  /** Referință plată (max 140 caractere) */
  reference?: string;
};

export type RevolutPaymentResponse = {
  id: string;
  state: string;
  request_id: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Funcție low-level HTTP (modulul singleton — lazy init la primul apel)
// ---------------------------------------------------------------------------

let _baseUrl: string | null = null;
let _apiToken: string | null = null;

function getBaseUrl(): string {
  if (_baseUrl) return _baseUrl;
  const sandbox = process.env.REVOLUT_SANDBOX === "true";
  _baseUrl = sandbox ? REVOLUT_API_BASE_SANDBOX : REVOLUT_API_BASE_PROD;
  return _baseUrl;
}

function getApiToken(): string {
  if (_apiToken) return _apiToken;
  const token = process.env.REVOLUT_API_TOKEN?.trim();
  if (!token) throw new Error("Missing required env: REVOLUT_API_TOKEN (OpenBao secret)");
  _apiToken = token;
  return _apiToken;
}

async function revolutRawRequest(method: string, path: string, body: unknown): Promise<unknown> {
  const url = `${getBaseUrl()}${path}`;
  const token = getApiToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(REVOLUT_TIMEOUT_MS),
  };

  if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const err = new Error(`Revolut API ${method} ${path} → HTTP ${response.status}: ${text}`);
    throw Object.assign(err, { statusCode: response.status, responseBody: text });
  }

  if (response.status === 204) return undefined;
  return response.json() as Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Circuit breaker singleton
// ---------------------------------------------------------------------------

const revolutBreaker = createCircuitBreaker(revolutRawRequest, "revolut", {
  timeout: REVOLUT_TIMEOUT_MS,
  volumeThreshold: 5,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
});

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  return withExternalApiMetrics("revolut", () =>
    revolutBreaker.fire(method, path, body),
  ) as Promise<T>;
}

// ---------------------------------------------------------------------------
// API publice Revolut Business v1
// ---------------------------------------------------------------------------

/**
 * GET /accounts — listează toate conturile business Revolut.
 * Folosit de A5 (revolut:balance:sync) pentru sync sold.
 */
export async function getRevolutAccounts(): Promise<RevolutAccount[]> {
  return request<RevolutAccount[]>("GET", "/accounts");
}

/**
 * GET /transactions/{id} — obține detalii tranzacție specifică.
 */
export async function getRevolutTransaction(id: string): Promise<RevolutTransaction> {
  return request<RevolutTransaction>("GET", `/transactions/${encodeURIComponent(id)}`);
}

/**
 * POST /pay — inițiază un transfer/plată Revolut.
 * Folosit de A4 (revolut:refund:process) pentru rambursări
 * (plată inversă cu request_id unic pentru idempotency Revolut).
 */
export async function createRevolutPayment(
  payload: RevolutPaymentRequest,
): Promise<RevolutPaymentResponse> {
  return request<RevolutPaymentResponse>("POST", "/pay", payload);
}

/**
 * Resetează cache-ul intern de token/baseUrl (util în teste).
 */
export function _resetRevolutClientCache(): void {
  _baseUrl = null;
  _apiToken = null;
}
