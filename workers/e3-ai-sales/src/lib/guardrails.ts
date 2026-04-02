/**
 * lib/guardrails.ts — Orchestrare și logică deterministică guardrails M71-M75
 *
 * FAZA 7n: Zero Hallucination Guardrails (Plan L1911-1926, ADR-0073, ADR-0081)
 *
 * Funcțiile din acest fișier sunt DETERMINISTICE — verifică contra DB/SQL.
 * NU folosesc LLM. Invocate din:
 *   - C16 (ai:response:validate) — validare paralelă sincronă înainte de trimitere
 *   - M71-M75 workers — procesare independentă per job din coadă
 *
 * Flow: Generate → [M71-M75] → PASS → Send | FAIL → Correction → Regenerate (max 3x)
 *                                                  → 3x FAIL → Escalate N76
 *
 * ANTI-HALUCINARE: §XIII L2607-2623 — LLM Guard Bearer (infraq.app/llm/v1/guard)
 * este SEPARAT de aceste business guardrails. Aceste funcții verifică contra DB.
 */
import {
  db,
  setSessionTenantId,
  guardrailViolations,
  goldProducts,
  negotiationItems,
  sql,
  eq,
  and,
} from "@cerniq/db";

// ── Tipuri comune ─────────────────────────────────────────────────────────────

export type GuardrailType = "price" | "stock" | "discount" | "sku" | "fiscal";

export type GuardrailSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface GuardrailCheckResult {
  passed: boolean;
  guardrailType: GuardrailType;
  violation?: string;
  details?: Record<string, unknown>;
}

export interface GuardrailContext {
  tenantId: string;
  negotiationId: string;
  response: string;
}

// ── Regex helpers ─────────────────────────────────────────────────────────────

/**
 * Extrage sume monetare din text.
 * Suportă format românesc (virgulă = zecimal, punct = mie) și internațional.
 * Exemple: "1500 RON", "1.500,50 lei", "€1500", "1500.50 EUR"
 */
export function extractPrices(text: string): Array<{ amount: number; raw: string }> {
  const results: Array<{ amount: number; raw: string }> = [];
  // Pattern 1: număr urmat de simbol/cod monedă (e.g. "1500 RON", "200 EUR", "€1500" la final)
  const postRe =
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:RON|lei|EUR|USD|€|\$)/gi; // NOSONAR
  // Pattern 2: simbol monedă urmat de număr (e.g. "€999", "$500")
  const preRe = /[€$]\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g; // NOSONAR

  const parseAmount = (rawNum: string): number | null => {
    let normalized: string;
    if (rawNum.includes(",") && rawNum.includes(".")) {
      normalized = rawNum.replaceAll(".", "").replace(",", ".");
    } else if (rawNum.includes(",")) {
      const commaIdx = rawNum.indexOf(",");
      const afterComma = rawNum.slice(commaIdx + 1);
      normalized = afterComma.length <= 2 ? rawNum.replace(",", ".") : rawNum.replaceAll(",", "");
    } else {
      normalized = rawNum;
    }
    const amount = Number.parseFloat(normalized);
    return !Number.isNaN(amount) && amount > 0 ? amount : null;
  };

  let m: RegExpExecArray | null;
  while ((m = postRe.exec(text)) !== null) {
    const raw = m[1];
    if (raw !== undefined) {
      const amount = parseAmount(raw);
      if (amount !== null) results.push({ amount, raw: m[0] });
    }
  }
  while ((m = preRe.exec(text)) !== null) {
    const raw = m[1];
    if (raw !== undefined) {
      const amount = parseAmount(raw);
      if (amount !== null) results.push({ amount, raw: m[0] });
    }
  }
  return results;
}

/**
 * Extrage procente de discount din text.
 * Exemple: "reducere 15%", "discount de 20%", "10% reducere", "rabat 5%"
 */
export function extractDiscounts(text: string): Array<{ percent: number; raw: string }> {
  const results: Array<{ percent: number; raw: string }> = [];
  const patterns = [
    /(?:reducere|discount|rabat|scutire|scăzut\s+cu)\s+(?:de\s+)?(\d{1,2}(?:[.,]\d{1,2})?)\s*%/gi,
    /(\d{1,2}(?:[.,]\d{1,2})?)\s*%\s+(?:reducere|discount|rabat)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const group = m[1];
      if (group === undefined) continue;
      const pct = Number.parseFloat(group.replace(",", "."));
      if (!Number.isNaN(pct) && pct > 0 && pct <= 100) {
        const raw = m[0];
        if (!results.some((r) => r.percent === pct)) {
          results.push({ percent: pct, raw });
        }
      }
    }
  }
  return results;
}

/**
 * Extrage coduri CUI/CIF din text (format românesc).
 * Exemple: "CUI: 12345678", "CIF RO12345678", "C.U.I. 1234567"
 */
export function extractCuis(text: string): Array<{ cui: string; raw: string }> {
  const results: Array<{ cui: string; raw: string }> = [];
  const re = /(?:C\.?U\.?I\.?|C\.?I\.?F\.?)[\s:]*(?:RO\s*)?(\d{6,10})|(?:^|\s)RO\s*(\d{6,10})/gi; // NOSONAR
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const cui = (m[1] ?? m[2] ?? "").trim();
    if (cui) results.push({ cui, raw: m[0].trim() });
  }
  return results;
}

/**
 * Validare CUI/CIF românesc prin algoritmul oficial modulo 11.
 * Ponderi: [7, 5, 3, 2, 1, 7, 5, 3, 2] aplicate de la dreapta la stânga (fără cifra de control).
 * Cifra de control = (suma * 10) % 11; dacă rezultatul == 10, cifra de control este 0.
 */
export function validateRomanianCui(cui: string): boolean {
  const digits = cui.replaceAll(/\D/g, "");
  if (digits.length < 2 || digits.length > 10) return false;

  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2] as const;
  const lastChar = digits.at(-1) ?? "0";
  const checkDigit = Number.parseInt(lastChar, 10);
  const dataDigits = digits.slice(0, -1).split("").map(Number);

  const offset = weights.length - dataDigits.length;
  let sum = 0;
  for (let i = 0; i < dataDigits.length; i++) {
    sum += (dataDigits[i] ?? 0) * (weights[offset + i] ?? 0);
  }

  const remainder = (sum * 10) % 11;
  const expectedCheckDigit = remainder === 10 ? 0 : remainder;

  return checkDigit === expectedCheckDigit;
}

/**
 * Detectează dacă textul conține afirmații despre disponibilitatea stocului.
 * Returnează true dacă AI face o afirmație pozitivă despre stoc.
 */
export function detectsStockAvailabilityClaim(text: string): boolean {
  const positivePatterns = [
    /avem\s+stoc/i,
    /este\s+(?:în\s+)?stoc/i,
    /(?:este|sunt)\s+disponibil/i,
    /putem\s+livra/i,
    /avem\s+(?:în\s+)?disponibil/i,
    /stoc\s+disponibil/i,
    /produsul?\s+(?:este|sunt)\s+disponibil/i,
    /livrare\s+imediată/i,
    /în\s+stoc\s+imediat/i,
    /in\s+stock/i,
    /available\s+(?:now|immediately)/i,
  ];
  return positivePatterns.some((p) => p.test(text));
}

/**
 * Extrage potențiale coduri SKU din text.
 * Detectează pattern-uri explicite ("SKU: ABC123", "cod produs: XYZ").
 * NU face matching generic pe toate cuvintele majuscule — prea mult noise.
 */
export function extractPotentialSkus(text: string): string[] {
  const results = new Set<string>();
  const explicit =
    /(?:SKU|cod\s+produs|product\s+code|ref\.?|cod\.?)\s*:?\s*([A-Z0-9][-A-Z0-9]{1,19})/gi;
  let m: RegExpExecArray | null;
  while ((m = explicit.exec(text)) !== null) {
    if (m[1]) results.add(m[1].toUpperCase());
  }
  return Array.from(results);
}

/** Rate TVA valide conform legislației române (2024-2026) */
export const VALID_TVA_RATES = new Set([0, 5, 9, 19]);

// ── M71: Price Check ─────────────────────────────────────────────────────────

export interface PriceCheckInput extends GuardrailContext {
  /** Toleranță acceptabilă față de prețul oficial (default 2%) */
  tolerancePercent?: number;
}

/**
 * M71 — Verificare deterministică preț AI vs gold_products.unit_price.
 * Dacă AI menționează o sumă care deviază cu mai mult de `tolerancePercent`
 * față de ORICE preț oficial al produselor din negociere → FAIL.
 */
export async function runPriceCheck(input: PriceCheckInput): Promise<GuardrailCheckResult> {
  const { tenantId, negotiationId, response, tolerancePercent = 2 } = input;

  const prices = extractPrices(response);
  if (prices.length === 0) {
    return { passed: true, guardrailType: "price" };
  }

  await setSessionTenantId(tenantId);
  const items = await db
    .select({
      sku: goldProducts.sku,
      officialPrice: goldProducts.unitPrice,
    })
    .from(negotiationItems)
    .innerJoin(goldProducts, eq(negotiationItems.productId, goldProducts.id))
    .where(
      and(
        eq(negotiationItems.tenantId, tenantId),
        eq(negotiationItems.negotiationId, negotiationId),
      ),
    );

  if (items.length === 0) {
    return { passed: true, guardrailType: "price" };
  }

  const officialPrices = items
    .filter((i): i is { sku: string | null; officialPrice: string } => i.officialPrice !== null)
    .map((i) => Number.parseFloat(i.officialPrice));

  if (officialPrices.length === 0) {
    return { passed: true, guardrailType: "price" };
  }

  for (const { amount, raw } of prices) {
    const hasMatch = officialPrices.some((official) => {
      const diff = Math.abs(amount - official) / official;
      return diff <= tolerancePercent / 100;
    });

    if (!hasMatch) {
      const minPrice = Math.min(...officialPrices);
      const maxPrice = Math.max(...officialPrices);
      return {
        passed: false,
        guardrailType: "price",
        violation: `Prețul menționat (${raw}) nu corespunde prețurilor oficiale [${minPrice.toFixed(2)}-${maxPrice.toFixed(2)}] (toleranță ${tolerancePercent}%)`,
        details: { extractedAmount: amount, officialPrices, tolerancePercent },
      };
    }
  }

  return { passed: true, guardrailType: "price" };
}

// ── M72: Stock Check ──────────────────────────────────────────────────────────

export type StockCheckInput = GuardrailContext;

/**
 * M72 — Verificare deterministică stoc AI vs get_available_stock(sku).
 * Dacă AI afirmă că există stoc dar gold.get_available_stock(sku) returnează 0 → FAIL.
 */
export async function runStockCheck(input: StockCheckInput): Promise<GuardrailCheckResult> {
  const { tenantId, negotiationId, response } = input;

  if (!detectsStockAvailabilityClaim(response)) {
    return { passed: true, guardrailType: "stock" };
  }

  await setSessionTenantId(tenantId);
  const items = await db
    .select({ sku: goldProducts.sku })
    .from(negotiationItems)
    .innerJoin(goldProducts, eq(negotiationItems.productId, goldProducts.id))
    .where(
      and(
        eq(negotiationItems.tenantId, tenantId),
        eq(negotiationItems.negotiationId, negotiationId),
      ),
    );

  const skus = items.map((i) => i.sku).filter((s): s is string => s !== null);
  if (skus.length === 0) {
    return { passed: true, guardrailType: "stock" };
  }

  for (const sku of skus) {
    const rows = await db.execute<{ available: number }>(
      sql`SELECT gold.get_available_stock(${sku}) AS available`,
    );
    const available = rows[0]?.available ?? 0;
    if (available <= 0) {
      return {
        passed: false,
        guardrailType: "stock",
        violation: `AI afirmă că există stoc pentru SKU "${sku}", dar stocul disponibil este ${available}`,
        details: { sku, available, responseSnippet: response.slice(0, 200) },
      };
    }
  }

  return { passed: true, guardrailType: "stock" };
}

// ── M73: Discount Check ───────────────────────────────────────────────────────

export type DiscountCheckInput = GuardrailContext;

/** Marjă minimă impusă de plan (8%) */
export const MIN_MARGIN_PERCENT = 8;

/** Verificare marjă netă pentru un discount față de un produs */
function checkNetMargin(
  percent: number,
  item: { sku: string | null; unitPrice: string | null },
): { passed: boolean; violation?: string; details?: Record<string, unknown> } {
  if (item.unitPrice === null) return { passed: true };
  const price = Number.parseFloat(item.unitPrice);
  if (price <= 0) return { passed: true };
  const netMargin = 100 - percent;
  if (netMargin < MIN_MARGIN_PERCENT) {
    return {
      passed: false,
      violation: `Discountul de ${percent}% pentru SKU "${item.sku ?? "?"}" lasă o marjă netă de ${netMargin.toFixed(1)}% < ${MIN_MARGIN_PERCENT}%`,
      details: {
        percent,
        netMargin,
        minMarginPercent: MIN_MARGIN_PERCENT,
        sku: item.sku,
        unitPrice: item.unitPrice,
      },
    };
  }
  return { passed: true };
}

/**
 * M73 — Verificare deterministică discount AI vs get_max_discount + margin ≥8%.
 * Dacă discount > limita DB SAU dacă marja rezultată < 8% → FAIL.
 */
export async function runDiscountCheck(input: DiscountCheckInput): Promise<GuardrailCheckResult> {
  const { tenantId, negotiationId, response } = input;

  const discounts = extractDiscounts(response);
  if (discounts.length === 0) {
    return { passed: true, guardrailType: "discount" };
  }

  await setSessionTenantId(tenantId);
  const items = await db
    .select({
      productId: goldProducts.id,
      sku: goldProducts.sku,
      unitPrice: goldProducts.unitPrice,
    })
    .from(negotiationItems)
    .innerJoin(goldProducts, eq(negotiationItems.productId, goldProducts.id))
    .where(
      and(
        eq(negotiationItems.tenantId, tenantId),
        eq(negotiationItems.negotiationId, negotiationId),
      ),
    );

  if (items.length === 0) {
    return { passed: true, guardrailType: "discount" };
  }

  const maxDiscountResults = await Promise.all(
    items.map(async (item) => {
      const rows = await db.execute<{ max_discount: number }>(
        sql`SELECT gold.get_max_discount(${tenantId}::uuid, ${item.productId}::uuid) AS max_discount`,
      );
      return {
        productId: item.productId,
        sku: item.sku,
        unitPrice: item.unitPrice,
        maxDiscount: rows[0]?.max_discount ?? 0,
      };
    }),
  );

  const globalMaxDiscount = Math.max(...maxDiscountResults.map((m) => m.maxDiscount));

  for (const { percent, raw } of discounts) {
    if (percent > globalMaxDiscount) {
      return {
        passed: false,
        guardrailType: "discount",
        violation: `Discountul menționat (${raw}) depășește limita maximă permisă de ${globalMaxDiscount.toFixed(1)}%`,
        details: { extractedPercent: percent, globalMaxDiscount, products: maxDiscountResults },
      };
    }

    for (const item of maxDiscountResults) {
      const marginResult = checkNetMargin(percent, item);
      if (!marginResult.passed) {
        return {
          passed: false,
          guardrailType: "discount",
          violation: marginResult.violation ?? "Marjă insuficientă",
          details: marginResult.details,
        };
      }
    }
  }

  return { passed: true, guardrailType: "discount" };
}

// ── M74: SKU Validate ─────────────────────────────────────────────────────────

export type SkuValidateInput = GuardrailContext;

/**
 * M74 — Verificare deterministică SKU-uri menționate de AI vs gold_products.
 * Detectează SKU-uri explicite (cu prefix "SKU:", "cod produs:", etc.) și
 * verifică existența lor în catalogul activ al tenant-ului.
 */
export async function runSkuValidate(input: SkuValidateInput): Promise<GuardrailCheckResult> {
  const { tenantId, response } = input;

  const candidateSkus = extractPotentialSkus(response);
  if (candidateSkus.length === 0) {
    return { passed: true, guardrailType: "sku" };
  }

  await setSessionTenantId(tenantId);
  const invalidSkus: string[] = [];

  for (const sku of candidateSkus) {
    const rows = await db
      .select({ id: goldProducts.id })
      .from(goldProducts)
      .where(
        and(
          eq(goldProducts.tenantId, tenantId),
          eq(goldProducts.sku, sku),
          eq(goldProducts.isActive, true),
        ),
      )
      .limit(1);
    if (rows.length === 0) {
      invalidSkus.push(sku);
    }
  }

  if (invalidSkus.length > 0) {
    return {
      passed: false,
      guardrailType: "sku",
      violation: `SKU-uri inexistente în catalog menționate de AI: ${invalidSkus.join(", ")}`,
      details: { invalidSkus, checkedSkus: candidateSkus },
    };
  }

  return { passed: true, guardrailType: "sku" };
}

// ── M75: Fiscal Validate ──────────────────────────────────────────────────────

export interface FiscalValidateInput {
  response: string;
}

/** Validare cote TVA din text — returnează lista de violații */
function validateTvaRates(response: string): string[] {
  const violations: string[] = [];
  const tvaRe = /TVA\s+(?:de\s+)?(\d{1,2})\s*%/gi;
  let m: RegExpExecArray | null;
  while ((m = tvaRe.exec(response)) !== null) {
    const rateStr = m[1];
    if (rateStr === undefined) continue;
    const rate = Number.parseInt(rateStr, 10);
    if (!VALID_TVA_RATES.has(rate)) {
      violations.push(`Cotă TVA invalidă menționată de AI: ${rate}% (valide: 0%, 5%, 9%, 19%)`);
    }
  }
  return violations;
}

/** Validare aritmetică totale fiscale — returnează violație sau null */
function validateFiscalArithmetic(response: string): string | null {
  const totalRe =
    /(?:subtotal|total\s+fără\s+TVA|valoare\s+fără\s+TVA|total\s+cu\s+TVA|total\s+general|total)[^\d]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)/gi; // NOSONAR
  const totals: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = totalRe.exec(response)) !== null) {
    const rawNum = m[1];
    if (rawNum === undefined) continue;
    const normalized = rawNum.replaceAll(".", "").replace(",", ".");
    const val = Number.parseFloat(normalized);
    if (!Number.isNaN(val) && val > 0) totals.push(val);
  }
  if (totals.length !== 3) return null;
  const [sub, tvaAmount, total] = totals as [number, number, number];
  const expected = sub + tvaAmount;
  const diff = Math.abs(expected - total) / total;
  if (diff > 0.01) {
    return `Aritmetică fiscală incorectă: ${sub.toFixed(2)} + ${tvaAmount.toFixed(2)} = ${expected.toFixed(2)} ≠ ${total.toFixed(2)} (diferență ${(diff * 100).toFixed(2)}%)`;
  }
  return null;
}

/**
 * M75 — Verificare deterministică fiscală:
 *   1. CUI/CIF valid prin algoritmul modulo 11
 *   2. Cote TVA valide (0%, 5%, 9%, 19%)
 *   3. Aritmetică totale: subtotal + TVA = total (toleranță 1%)
 */
export async function runFiscalValidate(input: FiscalValidateInput): Promise<GuardrailCheckResult> {
  const { response } = input;
  const violations: string[] = [];

  // 1. Validare CUI/CIF
  const cuis = extractCuis(response);
  for (const { cui, raw } of cuis) {
    if (!validateRomanianCui(cui)) {
      violations.push(`CUI/CIF invalid menționat de AI: "${raw}" (${cui})`);
    }
  }

  // 2. Validare rate TVA
  violations.push(...validateTvaRates(response));

  // 3. Validare aritmetică totale
  const arithmeticViolation = validateFiscalArithmetic(response);
  if (arithmeticViolation) violations.push(arithmeticViolation);

  if (violations.length > 0) {
    return {
      passed: false,
      guardrailType: "fiscal",
      violation: violations.join("; "),
      details: { violations, cuis: cuis.map((c) => c.cui) },
    };
  }

  return { passed: true, guardrailType: "fiscal" };
}

// ── Orchestrare (pentru C16) ──────────────────────────────────────────────────

export type RunAllGuardrailsInput = GuardrailContext;

export interface RunAllGuardrailsResult {
  passed: boolean;
  results: GuardrailCheckResult[];
  violations: GuardrailCheckResult[];
}

/**
 * Rulează toate 5 guardrails în paralel.
 * Folosit de C16 (ai:response:validate) pentru validare sincronă.
 * Plan flow: Generate → [M71-M75] → PASS → Send | FAIL → Correction → Regenerate (max 3x)
 */
export async function runAllGuardrails(
  input: RunAllGuardrailsInput,
): Promise<RunAllGuardrailsResult> {
  const [price, stock, discount, sku, fiscal] = await Promise.all([
    runPriceCheck(input),
    runStockCheck(input),
    runDiscountCheck(input),
    runSkuValidate(input),
    runFiscalValidate({ response: input.response }),
  ]);

  const results = [price, stock, discount, sku, fiscal];
  const violations = results.filter((r) => !r.passed);

  return { passed: violations.length === 0, results, violations };
}

/**
 * Persists o violație în guardrail_violations.
 * Apelată din M71-M75 workers individual (C16 face bulk insert propriu).
 */
export async function persistGuardrailViolation(params: {
  tenantId: string;
  nodeKey: string;
  violationType: GuardrailType;
  violation: string;
  details?: Record<string, unknown>;
  severity?: GuardrailSeverity;
}): Promise<void> {
  await db.insert(guardrailViolations).values({
    tenantId: params.tenantId,
    nodeKey: params.nodeKey,
    violationType: params.violationType,
    severity: params.severity ?? "HIGH",
    details: { violation: params.violation, ...params.details },
  });
}
