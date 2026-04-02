/**
 * I54 — document:template:compile (concurrency:10)
 *
 * Compilează template-uri HTML Handlebars pentru documente fiscale RO.
 * Template-urile sunt definite INLINE — NU din DB sau FS.
 * ANTI-HALUCINARE: DETERMINISTIC — NU LLM pentru documente fiscale.
 *
 * Tipul cognitiv: MaintenanceNeuron
 * VAT: 19% standard, 9% alimentar, 5% special
 */
import type { Processor } from "bullmq";
import Handlebars from "handlebars";

const LOG = "[i54-document-template-compile]";

// ── Templates HTML inline ─────────────────────────────────────────────────────

const INVOICE_TEMPLATE_RO = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Factura {{series}}-{{number}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; font-size: 12px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .company-name { font-size: 18px; font-weight: bold; }
    .doc-title { font-size: 22px; font-weight: bold; text-align: right; }
    .doc-meta { text-align: right; font-size: 11px; }
    .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 5px; background: #f0f0f0; padding: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #333; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
    td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
    tr:nth-child(even) td { background: #fafafa; }
    .totals { margin-top: 20px; float: right; width: 300px; }
    .totals table td { border-bottom: 1px solid #eee; }
    .totals .grand-total td { font-weight: bold; border-top: 2px solid #333; font-size: 13px; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #666; }
    .clearfix::after { content: ""; display: table; clear: both; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">{{company}}</div>
      <div>CUI: {{cui}}</div>
      {{#if nrRegCom}}<div>Nr. Reg. Com.: {{nrRegCom}}</div>{{/if}}
      {{#if iban}}<div>IBAN: {{iban}}</div>{{/if}}
    </div>
    <div>
      <div class="doc-title">FACTURĂ FISCALĂ</div>
      <div class="doc-meta">Seria {{series}} Nr. {{number}}</div>
      <div class="doc-meta">Data emiterii: {{issueDate}}</div>
    </div>
  </div>

  {{#if clientName}}
  <div class="section-title">Client</div>
  <div>{{clientName}}</div>
  {{#if clientCui}}<div>CUI Client: {{clientCui}}</div>{{/if}}
  {{/if}}

  <div class="section-title">Produse / Servicii</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Denumire</th>
        <th>Cantitate</th>
        <th>Preț unitar (RON)</th>
        <th>Discount (%)</th>
        <th>Total linie (RON)</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{inc @index}}</td>
        <td>{{name}}</td>
        <td>{{quantity}}</td>
        <td>{{unitPrice}}</td>
        <td>{{discountPct}}</td>
        <td>{{lineTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="clearfix">
    <div class="totals">
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">{{subtotal}} RON</td></tr>
        <tr><td>TVA {{vatRate}}%</td><td style="text-align:right">{{vat}} RON</td></tr>
        <tr class="grand-total"><td>TOTAL</td><td style="text-align:right">{{total}} RON</td></tr>
      </table>
    </div>
  </div>

  <div class="footer">
    Document generat electronic. TVA {{vatRate}}% conform legislației fiscale RO.
    {{#if companyCif}}CIF emitent: {{companyCif}}{{/if}}
  </div>
</body>
</html>`;

const PROFORMA_TEMPLATE_RO = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Proforma {{series}}-{{number}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; font-size: 12px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #555; padding-bottom: 10px; margin-bottom: 20px; }
    .company-name { font-size: 18px; font-weight: bold; }
    .doc-title { font-size: 22px; font-weight: bold; text-align: right; color: #555; }
    .doc-meta { text-align: right; font-size: 11px; }
    .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 5px; background: #f5f5f5; padding: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #555; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
    td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
    tr:nth-child(even) td { background: #fafafa; }
    .totals { margin-top: 20px; float: right; width: 300px; }
    .totals table td { border-bottom: 1px solid #eee; }
    .totals .grand-total td { font-weight: bold; border-top: 2px solid #555; font-size: 13px; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #666; }
    .proforma-note { background: #fffde7; border: 1px solid #f9a825; padding: 8px; margin-bottom: 15px; font-size: 11px; }
    .clearfix::after { content: ""; display: table; clear: both; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">{{company}}</div>
      <div>CUI: {{cui}}</div>
      {{#if nrRegCom}}<div>Nr. Reg. Com.: {{nrRegCom}}</div>{{/if}}
      {{#if iban}}<div>IBAN: {{iban}}</div>{{/if}}
    </div>
    <div>
      <div class="doc-title">PROFORMĂ</div>
      <div class="doc-meta">Seria {{series}} Nr. {{number}}</div>
      <div class="doc-meta">Data emiterii: {{issueDate}}</div>
    </div>
  </div>

  <div class="proforma-note">
    NOTĂ: Aceasta este o factură proformă și nu reprezintă un document fiscal. Factura fiscală va fi emisă după achitarea sumei totale.
  </div>

  {{#if clientName}}
  <div class="section-title">Client</div>
  <div>{{clientName}}</div>
  {{#if clientCui}}<div>CUI Client: {{clientCui}}</div>{{/if}}
  {{/if}}

  <div class="section-title">Produse / Servicii</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Denumire</th>
        <th>Cantitate</th>
        <th>Preț unitar (RON)</th>
        <th>Discount (%)</th>
        <th>Total linie (RON)</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{inc @index}}</td>
        <td>{{name}}</td>
        <td>{{quantity}}</td>
        <td>{{unitPrice}}</td>
        <td>{{discountPct}}</td>
        <td>{{lineTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="clearfix">
    <div class="totals">
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">{{subtotal}} RON</td></tr>
        <tr><td>TVA {{vatRate}}%</td><td style="text-align:right">{{vat}} RON</td></tr>
        <tr class="grand-total"><td>TOTAL</td><td style="text-align:right">{{total}} RON</td></tr>
      </table>
    </div>
  </div>

  <div class="footer">
    Proformă generată electronic. TVA {{vatRate}}% conform legislației fiscale RO.
  </div>
</body>
</html>`;

const CREDIT_NOTE_TEMPLATE_RO = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Nota de Credit {{series}}-{{number}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; font-size: 12px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #c62828; padding-bottom: 10px; margin-bottom: 20px; }
    .company-name { font-size: 18px; font-weight: bold; }
    .doc-title { font-size: 22px; font-weight: bold; text-align: right; color: #c62828; }
    .doc-meta { text-align: right; font-size: 11px; }
    .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 5px; background: #ffebee; padding: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #c62828; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
    td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
    tr:nth-child(even) td { background: #fafafa; }
    .totals { margin-top: 20px; float: right; width: 300px; }
    .totals table td { border-bottom: 1px solid #eee; }
    .totals .grand-total td { font-weight: bold; border-top: 2px solid #c62828; font-size: 13px; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #666; }
    .credit-note-ref { background: #ffebee; border: 1px solid #c62828; padding: 8px; margin-bottom: 15px; font-size: 11px; }
    .clearfix::after { content: ""; display: table; clear: both; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">{{company}}</div>
      <div>CUI: {{cui}}</div>
      {{#if nrRegCom}}<div>Nr. Reg. Com.: {{nrRegCom}}</div>{{/if}}
      {{#if iban}}<div>IBAN: {{iban}}</div>{{/if}}
    </div>
    <div>
      <div class="doc-title">NOTĂ DE CREDIT</div>
      <div class="doc-meta">Seria {{series}} Nr. {{number}}</div>
      <div class="doc-meta">Data emiterii: {{issueDate}}</div>
    </div>
  </div>

  {{#if originalInvoiceRef}}
  <div class="credit-note-ref">
    Referință factură stornată: {{originalInvoiceRef}}
  </div>
  {{/if}}

  {{#if clientName}}
  <div class="section-title">Client</div>
  <div>{{clientName}}</div>
  {{#if clientCui}}<div>CUI Client: {{clientCui}}</div>{{/if}}
  {{/if}}

  <div class="section-title">Produse / Servicii stornate</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Denumire</th>
        <th>Cantitate</th>
        <th>Preț unitar (RON)</th>
        <th>Discount (%)</th>
        <th>Total linie (RON)</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{inc @index}}</td>
        <td>{{name}}</td>
        <td>{{quantity}}</td>
        <td>{{unitPrice}}</td>
        <td>{{discountPct}}</td>
        <td>{{lineTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="clearfix">
    <div class="totals">
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">{{subtotal}} RON</td></tr>
        <tr><td>TVA {{vatRate}}%</td><td style="text-align:right">{{vat}} RON</td></tr>
        <tr class="grand-total"><td>TOTAL STORNAT</td><td style="text-align:right">{{total}} RON</td></tr>
      </table>
    </div>
  </div>

  <div class="footer">
    Notă de credit generată electronic. TVA {{vatRate}}% conform legislației fiscale RO.
  </div>
</body>
</html>`;

// ── Template registry ─────────────────────────────────────────────────────────

const TEMPLATE_REGISTRY: Record<string, string> = {
  "invoice-ro": INVOICE_TEMPLATE_RO,
  "proforma-ro": PROFORMA_TEMPLATE_RO,
  "credit-note-ro": CREDIT_NOTE_TEMPLATE_RO,
};

// ── Handlebars helper: inc (increment index) ─────────────────────────────────

Handlebars.registerHelper("inc", (value: number) => value + 1);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentTemplateCompileJobData {
  tenantId: string;
  templateName: string;
  templateVariables: Record<string, unknown>;
  oblioDocumentId?: string;
}

export interface DocumentTemplateCompileResult {
  ok: true;
  html: string;
  templateName: string;
  compiledAt: string;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const documentTemplateCompileProcessor: Processor<
  DocumentTemplateCompileJobData,
  DocumentTemplateCompileResult
> = async (job) => {
  const { tenantId, templateName, templateVariables, oblioDocumentId } = job.data;

  const rawTemplate = TEMPLATE_REGISTRY[templateName];
  if (!rawTemplate) {
    const available = Object.keys(TEMPLATE_REGISTRY).join(", ");
    throw new Error(
      `i54: template necunoscut "${templateName}". Template-uri disponibile: ${available}`,
    );
  }

  const compiledFn = Handlebars.compile(rawTemplate);
  const html = compiledFn(templateVariables);
  const compiledAt = new Date().toISOString();

  console.info(
    `${LOG} tenantId=${tenantId} templateName=${templateName} oblioDocumentId=${oblioDocumentId ?? "n/a"} compiledAt=${compiledAt}`,
  );

  return { ok: true, html, templateName, compiledAt };
};
