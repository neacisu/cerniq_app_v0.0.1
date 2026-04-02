/**
 * Oblio API Client — STUB
 *
 * Client HTTP pentru Oblio API (facturare electronică RO).
 * API key din variabila de mediu OBLIO_API_KEY (OpenBao injection — Regula 6 ZERO_HARDCODE).
 *
 * Rate limits per endpoint (din plan FAZA 7h L1863-1873):
 *   - create proforma/invoice: 60/min
 *   - cancel:                  10/min
 *   - client validate:          1/sec
 *
 * STUB: toate metodele loghează intenția și returnează date simulate.
 * Implementarea HTTP reală va fi în FAZA 13 (external-integrations).
 *
 * ANTI-HALLUCINARE:
 *   - NU Axios/fetch direct — va folosi circuit breaker + rate limiter din @cerniq/worker-shared
 *   - NU hardcodat API key — citit EXCLUSIV din process.env.OBLIO_API_KEY
 *   - document_type ENUM: PROFORMA / INVOICE / CREDIT_NOTE (e3.ts L53)
 */

const LOG = "[oblio-client]";

// ── Configurare — API key din mediu, NU hardcodat (Regula 6) ──────────────────
const OBLIO_API_KEY = process.env.OBLIO_API_KEY ?? "";
const OBLIO_BASE_URL = process.env.OBLIO_BASE_URL ?? "https://www.oblio.eu/api";

if (!OBLIO_API_KEY && process.env.NODE_ENV === "production") {
  console.warn(`${LOG} OBLIO_API_KEY lipsă — integrarea Oblio va funcționa în mod STUB`);
}

// ── Interfețe de date ──────────────────────────────────────────────────────────

export interface OblioLineItem {
  name: string;
  code?: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
}

export interface OblioProformaPayload {
  tenantId: string;
  clientCui: string;
  clientName: string;
  items: OblioLineItem[];
  subtotal: number;
  vat: number;
  total: number;
  currency?: string;
}

export interface OblioProformaResult {
  oblioId: string;
  series: string;
  number: number;
  total: number;
  subtotal: number;
  vat: number;
}

export interface OblioUpdateProformaPayload {
  oblioId: string;
  items?: OblioLineItem[];
  subtotal: number;
  vat: number;
  total: number;
}

export interface OblioUpdateProformaResult {
  oblioId: string;
  updated: boolean;
}

export interface OblioConvertResult {
  invoiceOblioId: string;
  series: string;
  number: number;
}

export interface OblioCancelResult {
  creditNoteOblioId: string;
  cancelled: boolean;
}

export interface OblioClientData {
  tenantId: string;
  cui: string;
  name: string;
  platitorTva: boolean;
  address?: string;
}

export interface OblioClientResult {
  oblioClientId: string;
  clientName: string;
  isNew: boolean;
}

export interface OblioStockItem {
  sku: string;
  quantity: number;
  name?: string;
}

export interface OblioStockSyncResult {
  synced: number;
  errors: number;
  note: string;
}

export interface OblioWebhookEvent {
  oblioId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface OblioWebhookResult {
  acknowledged: boolean;
  oblioId: string;
  eventType: string;
}

// ── Client STUB ───────────────────────────────────────────────────────────────

/**
 * oblioClient — interfață unificată pentru toate operațiile Oblio API.
 *
 * Toate metodele sunt STUB în faza curentă.
 * baseUrl și apiKey sunt accesibile pentru referință (nu apeluri reale).
 */
export const oblioClient = {
  /** Base URL pentru referință în logs/debug */
  baseUrl: OBLIO_BASE_URL,

  /**
   * Creează o proformă în Oblio.
   * Rate limit: 60/min.
   * STUB — returnează date simulate.
   */
  async createProforma(payload: OblioProformaPayload): Promise<OblioProformaResult> {
    console.info(
      `${LOG} STUB createProforma tenantId=${payload.tenantId} client=${payload.clientCui} items=${payload.items.length} total=${payload.total}`,
    );
    return {
      oblioId: "stub-pf-" + payload.tenantId.slice(0, 8),
      series: "P",
      number: 1001,
      total: payload.total,
      subtotal: payload.subtotal,
      vat: payload.vat,
    };
  },

  /**
   * Actualizează o proformă existentă în Oblio.
   * Rate limit: 60/min.
   * STUB.
   */
  async updateProforma(payload: OblioUpdateProformaPayload): Promise<OblioUpdateProformaResult> {
    console.info(`${LOG} STUB updateProforma oblioId=${payload.oblioId} total=${payload.total}`);
    return { oblioId: payload.oblioId, updated: true };
  },

  /**
   * Convertește o proformă în factură în Oblio.
   * Rate limit: 60/min.
   * STUB.
   */
  async convertProformaToInvoice(proformaOblioId: string): Promise<OblioConvertResult> {
    console.info(`${LOG} STUB convertProformaToInvoice proformaOblioId=${proformaOblioId}`);
    return {
      invoiceOblioId: "stub-inv-" + proformaOblioId.slice(-8),
      series: "F",
      number: 2001,
    };
  },

  /**
   * Anulează o factură în Oblio (storno) + creează nota de credit.
   * Rate limit: 10/min.
   * STUB.
   */
  async cancelInvoice(invoiceOblioId: string, reason: string): Promise<OblioCancelResult> {
    console.info(`${LOG} STUB cancelInvoice invoiceOblioId=${invoiceOblioId} reason=${reason}`);
    return {
      creditNoteOblioId: "stub-cn-" + invoiceOblioId.slice(-8),
      cancelled: true,
    };
  },

  /**
   * Verifică/creează un client Oblio pe baza CUI.
   * Date sensibile (CUI) — procesate exclusiv pe self-hosted (Regula 6).
   * Rate limit: 1/sec.
   * STUB.
   */
  async validateClient(data: OblioClientData): Promise<OblioClientResult> {
    console.info(
      `${LOG} STUB validateClient tenantId=${data.tenantId} cui=${data.cui} name=${data.name}`,
    );
    return {
      oblioClientId: "stub-client-" + data.cui,
      clientName: data.name,
      isNew: false,
    };
  },

  /**
   * Sincronizează stocul cu Oblio (bidirecțional, stock_inventory source of truth).
   * STUB.
   */
  async syncStock(tenantId: string, items: OblioStockItem[]): Promise<OblioStockSyncResult> {
    console.info(`${LOG} STUB syncStock tenantId=${tenantId} items=${items.length}`);
    return {
      synced: items.length,
      errors: 0,
      note: "oblio-stock-sync-stub",
    };
  },

  /**
   * Procesează un webhook primit de la Oblio.
   * Idempotent — verificat în worker înainte de apel.
   * STUB.
   */
  async processWebhookEvent(event: OblioWebhookEvent): Promise<OblioWebhookResult> {
    console.info(
      `${LOG} STUB processWebhookEvent oblioId=${event.oblioId} eventType=${event.eventType}`,
    );
    return {
      acknowledged: true,
      oblioId: event.oblioId,
      eventType: event.eventType,
    };
  },
};

export type OblioClient = typeof oblioClient;

// ── SPV / eFactura via Oblio ──────────────────────────────────────────────────

const OBLIO_CLIENT_ID = process.env.OBLIO_CLIENT_ID ?? "";
const OBLIO_CLIENT_SECRET = process.env.OBLIO_CLIENT_SECRET ?? "";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let _tokenCache: TokenCache | null = null;

/**
 * Obține un access token OAuth2 de la Oblio API.
 * Token-ul este cacheat module-level și reînnoit automat cu 60s buffer.
 */
export async function getOblioAccessToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const params = new URLSearchParams({
      client_id: OBLIO_CLIENT_ID,
      client_secret: OBLIO_CLIENT_SECRET,
    });
    const resp = await fetch(`${OBLIO_BASE_URL}/authorize/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`Oblio token error: ${resp.status} ${resp.statusText}`);
    }
    const json = (await resp.json()) as { access_token: string; expires_in: string };
    const expiresIn = Number(json.expires_in ?? "3600");
    _tokenCache = {
      token: json.access_token,
      expiresAt: now + expiresIn * 1000,
    };
    return _tokenCache.token;
  } finally {
    clearTimeout(timeout);
  }
}

export interface OblioEinvoiceStatusResult {
  sent: boolean;
  code: number; // -1=neconfigurat, 0=în prelucrare, 1=validat, 2=erori
  text: string;
  indexUpload?: string;
  idDownload?: string;
}

/**
 * Trimite o factură în SPV via Oblio API.
 * POST /api/docs/einvoice cu form body: cif, seriesName, number
 */
export async function sendInvoiceToSpv(
  cif: string,
  seriesName: string,
  number: number,
): Promise<OblioEinvoiceStatusResult> {
  const token = await getOblioAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const params = new URLSearchParams({ cif, seriesName, number: String(number) });
    const resp = await fetch(`${OBLIO_BASE_URL}/docs/einvoice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`Oblio sendInvoiceToSpv error: ${resp.status} ${resp.statusText}`);
    }
    const json = (await resp.json()) as {
      status: number;
      data: { text: string; sent: boolean; code: number };
    };
    return {
      sent: json.data.sent,
      code: json.data.code,
      text: json.data.text,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verifică statusul eFacturii via Oblio API (listare cu withEinvoiceStatus=1).
 * GET /api/docs/invoice/list?cif=...&seriesName=...&number=...&withEinvoiceStatus=1
 */
export async function checkEinvoiceStatus(
  cif: string,
  seriesName: string,
  number: number,
): Promise<OblioEinvoiceStatusResult> {
  const token = await getOblioAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const params = new URLSearchParams({
      cif,
      seriesName,
      number: String(number),
      withEinvoiceStatus: "1",
    });
    const url = `${OBLIO_BASE_URL}/docs/invoice/list?${params.toString()}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`Oblio checkEinvoiceStatus error: ${resp.status} ${resp.statusText}`);
    }
    const json = (await resp.json()) as {
      data: Array<{
        seriesName: string;
        number: string;
        einvoiceStatus: { text: string; sent: boolean; code: number };
        indexUpload?: string;
        idDownload?: string;
      }>;
    };
    const entry = json.data[0];
    if (!entry) {
      return { sent: false, code: -1, text: "No data returned" };
    }
    return {
      sent: entry.einvoiceStatus.sent,
      code: entry.einvoiceStatus.code,
      text: entry.einvoiceStatus.text,
      indexUpload: entry.indexUpload,
      idDownload: entry.idDownload,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Obține link-ul PDF al unui document din Oblio.
 * GET /api/docs/invoice (sau /proforma) ?cif=...&seriesName=...&number=...
 * Response: { data: { link: "https://www.oblio.eu/utils/show_file/?..." } }
 *
 * Oblio generează documentul PDF și îl servește via link semnat (include token 'it=...')
 * care permite descărcarea fără autentificare suplimentară.
 */
export async function getDocumentDownloadLink(
  cif: string,
  documentType: "INVOICE" | "PROFORMA" | "CREDIT_NOTE",
  seriesName: string,
  number: number,
): Promise<string> {
  const token = await getOblioAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    // CREDIT_NOTE este tot o factură în Oblio (storno)
    const endpoint = documentType === "PROFORMA" ? "proforma" : "invoice";
    const params = new URLSearchParams({ cif, seriesName, number: String(number) });
    const url = `${OBLIO_BASE_URL}/docs/${endpoint}?${params.toString()}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`Oblio getDocumentDownloadLink error: ${resp.status} ${resp.statusText}`);
    }
    const json = (await resp.json()) as { status: number; data: { link: string } };
    if (!json.data?.link) {
      throw new Error("Oblio getDocumentDownloadLink: link absent în răspuns");
    }
    return json.data.link;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Descarcă conținutul binar (PDF) al unui document Oblio folosind link-ul semnat.
 * Link-ul Oblio conține token 'it=...' care permite accesul fără Bearer token suplimentar.
 */
export async function downloadDocumentPdf(link: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const resp = await fetch(link, { signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`Oblio downloadDocumentPdf error: ${resp.status} ${resp.statusText}`);
    }
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Descarcă arhiva ZIP SPV pentru o factură validată via Oblio API.
 * GET /api/docs/einvoice?cif=...&seriesName=...&number=...
 * Returns: Buffer (ZIP archive binary)
 */
export async function downloadSpvArchive(
  cif: string,
  seriesName: string,
  number: number,
): Promise<Buffer> {
  const token = await getOblioAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const params = new URLSearchParams({ cif, seriesName, number: String(number) });
    const url = `${OBLIO_BASE_URL}/docs/einvoice?${params.toString()}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`Oblio downloadSpvArchive error: ${resp.status} ${resp.statusText}`);
    }
    const arrayBuffer = await resp.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}
