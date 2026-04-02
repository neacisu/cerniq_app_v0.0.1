/**
 * docusign-client.ts — Client DocuSign eSignature API v2.1
 *
 * Auth: JWT Grant flow (service account impersonation) — ADR-0095, Plan FAZA 8f
 *   - NU este OAuth2 Authorization Code (anti-halucinare A)
 *   - JWT assertion semnat cu RSA-256 private key din env/OpenBao
 *   - Token cache in-memory cu TTL 3500s (token DocuSign expiră la 3600s)
 *   - Retry automat la 401 (token expirat)
 *
 * Env vars (din OpenBao via loadSecretsFromFile sau env direct):
 *   DOCUSIGN_INTEGRATION_KEY — client ID / integration key
 *   DOCUSIGN_USER_ID         — user ID pentru impersonation (subject al JWT)
 *   DOCUSIGN_ACCOUNT_ID      — account ID DocuSign
 *   DOCUSIGN_RSA_PRIVATE_KEY — RSA private key PEM (poate conține \n)
 *   DOCUSIGN_ENV             — "sandbox" (default) | "prod"
 *   DOCUSIGN_TIMEOUT_MS      — timeout HTTP (default 15000ms)
 *
 * Base URL:
 *   Sandbox: https://demo.docusign.net/restapi/v2.1
 *   Prod:    https://na3.docusign.net/restapi/v2.1
 *
 * Rate limit DocuSign: 1000 req/h — gestionat la nivel BullMQ queue G34 (15 req/min)
 */
import { createSign } from "node:crypto";
import { createCircuitBreaker, withExternalApiMetrics } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DOCUSIGN_ENV = process.env["DOCUSIGN_ENV"] ?? "sandbox";
const IS_SANDBOX = DOCUSIGN_ENV !== "prod";

const DOCUSIGN_AUTH_BASE = IS_SANDBOX
  ? "https://account-d.docusign.com"
  : "https://account.docusign.com";

const DOCUSIGN_API_BASE = IS_SANDBOX
  ? "https://demo.docusign.net/restapi/v2.1"
  : "https://na3.docusign.net/restapi/v2.1";

const DOCUSIGN_TIMEOUT_MS = Number(process.env["DOCUSIGN_TIMEOUT_MS"] ?? 15_000);

// JWT token cache in-memory (TTL 3500s < expiry 3600s)
const TOKEN_TTL_MS = 3_500_000;

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

// ---------------------------------------------------------------------------
// Tipuri DocuSign eSignature API v2.1
// ---------------------------------------------------------------------------

export type DocuSignSigner = {
  email: string;
  name: string;
  recipientId: string;
};

export type DocuSignDocument = {
  documentBase64: string;
  documentId: string;
  fileExtension: string;
  name: string;
};

export type CreateEnvelopePayload = {
  emailSubject: string;
  documents: DocuSignDocument[];
  signers: DocuSignSigner[];
};

export type DocuSignEnvelopeStatus =
  | "created"
  | "sent"
  | "delivered"
  | "signed"
  | "completed"
  | "declined"
  | "voided";

export type CreateEnvelopeResponse = {
  envelopeId: string;
  status: DocuSignEnvelopeStatus;
  statusDateTime: string;
  uri: string;
};

export type GetEnvelopeStatusResponse = {
  envelopeId: string;
  status: DocuSignEnvelopeStatus;
  sentDateTime?: string;
  completedDateTime?: string;
  declinedDateTime?: string;
  voidedDateTime?: string;
  voidedReason?: string;
  emailSubject: string;
  expireEnabled?: string;
  expireDateTime?: string;
};

// ---------------------------------------------------------------------------
// JWT Grant — creare assertion RS256
// ---------------------------------------------------------------------------

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[docusign-client] Missing required env var: ${name}`);
  }
  return value;
}

function createJwtAssertion(): string {
  const integrationKey = getEnvVar("DOCUSIGN_INTEGRATION_KEY");
  const userId = getEnvVar("DOCUSIGN_USER_ID");
  // Normalize private key: suportăm atât \n literal cât și newline real
  const privateKeyRaw = getEnvVar("DOCUSIGN_RSA_PRIVATE_KEY");
  const privateKey = privateKeyRaw.replaceAll(String.raw`\n`, "\n");

  const aud = IS_SANDBOX ? "account-d.docusign.com" : "account.docusign.com";
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: integrationKey,
      sub: userId,
      aud,
      iat: now,
      exp: now + 3600,
      scope: "signature impersonation",
    }),
  ).toString("base64url");

  const toSign = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(toSign);
  const signature = sign.sign(privateKey, "base64url");

  return `${toSign}.${signature}`;
}

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

async function fetchAccessToken(): Promise<string> {
  const assertion = createJwtAssertion();

  const response = await fetch(`${DOCUSIGN_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(DOCUSIGN_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`[docusign-client] Token fetch failed ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  return data.access_token;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.accessToken;
  }

  const accessToken = await fetchAccessToken();
  tokenCache = { accessToken, expiresAt: now + TOKEN_TTL_MS };
  return accessToken;
}

// ---------------------------------------------------------------------------
// Raw HTTP request (wrapat de circuit breaker)
// ---------------------------------------------------------------------------

async function docuSignRawRequest(method: string, path: string, body: unknown): Promise<unknown> {
  const accountId = getEnvVar("DOCUSIGN_ACCOUNT_ID");
  const url = `${DOCUSIGN_API_BASE}/accounts/${accountId}${path}`;

  const doRequest = async (token: string): Promise<Response> => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    return fetch(url, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(DOCUSIGN_TIMEOUT_MS),
    });
  };

  let response = await doRequest(await getAccessToken());

  // Retry automat la 401 (token expirat/revocat)
  if (response.status === 401) {
    tokenCache = null;
    response = await doRequest(await getAccessToken(true));
  }

  if (response.ok) {
    return response.json();
  }

  const errorBody = await response.text();
  throw new Error(`[docusign-client] ${method} ${path} failed ${response.status}: ${errorBody}`);
}

async function docuSignRawDownload(envelopeId: string, documentId: string): Promise<Buffer> {
  const accountId = getEnvVar("DOCUSIGN_ACCOUNT_ID");
  const url = `${DOCUSIGN_API_BASE}/accounts/${accountId}/envelopes/${envelopeId}/documents/${documentId}`;

  const doRequest = async (token: string): Promise<Response> =>
    fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" },
      signal: AbortSignal.timeout(DOCUSIGN_TIMEOUT_MS),
    });

  let response = await doRequest(await getAccessToken());

  if (response.status === 401) {
    tokenCache = null;
    response = await doRequest(await getAccessToken(true));
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[docusign-client] download document failed ${response.status}: ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// Circuit breakers (unul pentru JSON requests, unul pentru download PDF)
// ---------------------------------------------------------------------------

const docuSignBreaker = createCircuitBreaker(docuSignRawRequest, "docusign", {
  timeout: DOCUSIGN_TIMEOUT_MS,
  volumeThreshold: 5,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
});

const docuSignDownloadBreaker = createCircuitBreaker(docuSignRawDownload, "docusign-download", {
  timeout: DOCUSIGN_TIMEOUT_MS,
  volumeThreshold: 3,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
});

// ---------------------------------------------------------------------------
// API publice
// ---------------------------------------------------------------------------

/**
 * G34: Creare envelope DocuSign cu document PDF + signer.
 * POST /accounts/{accountId}/envelopes
 */
export async function createDocuSignEnvelope(
  payload: CreateEnvelopePayload,
): Promise<CreateEnvelopeResponse> {
  return withExternalApiMetrics("docusign", () =>
    docuSignBreaker.fire("POST", "/envelopes", {
      emailSubject: payload.emailSubject,
      documents: payload.documents,
      recipients: {
        signers: payload.signers.map((s) => ({
          email: s.email,
          name: s.name,
          recipientId: s.recipientId,
          tabs: {
            signHereTabs: [
              {
                documentId: payload.documents[0]?.documentId ?? "1",
                pageNumber: "1",
                xPosition: "400",
                yPosition: "700",
              },
            ],
          },
        })),
      },
      status: "sent",
    }),
  ) as Promise<CreateEnvelopeResponse>;
}

/**
 * G35: Verificare status envelope DocuSign.
 * GET /accounts/{accountId}/envelopes/{envelopeId}
 */
export async function getDocuSignEnvelopeStatus(
  envelopeId: string,
): Promise<GetEnvelopeStatusResponse> {
  return withExternalApiMetrics("docusign", () =>
    docuSignBreaker.fire("GET", `/envelopes/${envelopeId}`, null),
  ) as Promise<GetEnvelopeStatusResponse>;
}

/**
 * G36: Descărcare PDF semnat din envelope DocuSign.
 * GET /accounts/{accountId}/envelopes/{envelopeId}/documents/{documentId}
 */
export async function downloadDocuSignDocument(
  envelopeId: string,
  documentId = "combined",
): Promise<Buffer> {
  return withExternalApiMetrics("docusign", () =>
    docuSignDownloadBreaker.fire(envelopeId, documentId),
  );
}

// ---------------------------------------------------------------------------
// Helper pentru teste (reset cache)
// ---------------------------------------------------------------------------

export function _resetDocuSignClientCache(): void {
  tokenCache = null;
}
