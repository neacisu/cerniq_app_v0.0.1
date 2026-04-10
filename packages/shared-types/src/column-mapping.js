/**
 * Single source of truth for column mapping definitions used across the import pipeline.
 *
 * Consumed by:
 * - `ingest-utils.ts` (auto-detection: header → canonical field)
 * - `imports-bronze.ts` (API: mapping targets for UI + auto-mapping)
 */
export const COLUMN_MAPPING_DEFINITIONS = [
    // --- Identificatori ---
    {
        key: "companyName",
        label: "Denumire Firmă",
        aliases: [
            "company",
            "company_name",
            "firma",
            "denumire",
            "nume_firma",
            "denumire firma",
            "denumirefirma",
            "denumire companie",
            "denumirecompanie",
        ],
    },
    {
        key: "cui",
        label: "CUI / CIF",
        aliases: ["cui", "cif", "vat", "vat_number", "cod_fiscal", "codfiscal"],
    },
    {
        key: "nrRegistru",
        label: "Nr. Registru Comerțului",
        aliases: [
            "reg_com",
            "j_number",
            "nr_registru",
            "nr reg com",
            "nrregcom",
            "nr_reg_com",
            "nr_reg_comert",
            "nr. rc.",
            "nrrc",
            "numar_registru",
        ],
    },
    // --- Contact ---
    { key: "email", label: "Email", aliases: ["email", "email_address", "mail"] },
    {
        key: "phone",
        label: "Telefon",
        aliases: ["phone", "telefon", "telefon_mobil", "mobile", "telefon mf", "telefonmf"],
    },
    { key: "website", label: "Website", aliases: ["website", "site", "url"] },
    {
        key: "contactPerson",
        label: "Persoana de contact",
        aliases: ["contact", "persoana", "contact_person", "responsabil"],
    },
    // --- Locație ---
    {
        key: "address",
        label: "Adresă",
        aliases: ["address", "adresa", "street_address", "adresa anaf", "adresaanaf"],
    },
    { key: "judet", label: "Județ", aliases: ["judet", "county", "region"] },
    { key: "localitate", label: "Localitate", aliases: ["localitate", "oras", "city", "town"] },
    { key: "codPostal", label: "Cod Poștal", aliases: ["cod_postal", "zip", "postal_code"] },
    // --- CAEN ---
    {
        key: "caen",
        label: "Cod CAEN",
        aliases: ["caen", "caen_code", "nace", "nace code", "nacecode", "cod_caen", "codcaen"],
    },
    {
        key: "caenText",
        label: "Denumire CAEN",
        aliases: ["nace text", "nacetext", "nace_text", "denumire_caen", "denumirecaen"],
    },
    // --- Financiar ---
    {
        key: "cifraAfaceri",
        label: "Cifra de afaceri",
        aliases: ["cifra de afaceri", "cifradeafaceri", "cifra_afaceri", "turnover", "revenue"],
    },
    {
        key: "profitNet",
        label: "Profit / Pierdere Netă",
        aliases: [
            "profit / pierdere neta",
            "profitpierderereta",
            "profit_net",
            "net_profit",
            "profit net",
        ],
    },
    {
        key: "profitBrut",
        label: "Profit / Pierdere Brută",
        aliases: [
            "profit / pierdere bruta",
            "profitpierderebruta",
            "profit_brut",
            "gross_profit",
            "profit brut",
        ],
    },
    {
        key: "venituriTotale",
        label: "Venituri totale",
        aliases: ["venituri totale", "venituritotale", "venituri_totale", "total_revenue"],
    },
    {
        key: "cheltuieliTotale",
        label: "Cheltuieli totale",
        aliases: ["cheltuieli totale", "cheltuielitotale", "cheltuieli_totale", "total_expenses"],
    },
    {
        key: "activeTotale",
        label: "Total Active",
        aliases: ["total active", "totalactive", "active_totale", "total_assets"],
    },
    {
        key: "activeImobilizate",
        label: "Active Imobilizate",
        aliases: ["active imobilizate", "activeimobilizate", "active_imobilizate", "fixed_assets"],
    },
    {
        key: "activeCirculante",
        label: "Active Circulante",
        aliases: ["active circulante", "activecirculante", "active_circulante", "current_assets"],
    },
    { key: "creante", label: "Creanțe", aliases: ["creante", "receivables", "trade_receivables"] },
    { key: "stocuri", label: "Stocuri", aliases: ["stocuri", "inventories", "stocks"] },
    {
        key: "cheltuieliInAvans",
        label: "Cheltuieli în avans",
        aliases: [
            "cheltuieli in avans",
            "cheltuieliinavans",
            "cheltuieli_in_avans",
            "prepaid_expenses",
        ],
    },
    {
        key: "capitaluriProprii",
        label: "Capitaluri proprii Total",
        aliases: [
            "capitaluri proprii total",
            "capitaluriproprittotal",
            "capitaluri_proprii",
            "equity",
            "shareholders_equity",
        ],
    },
    {
        key: "capitalSocial",
        label: "Capital social",
        aliases: ["capital social", "capitalsocial", "capital_social", "share_capital"],
    },
    {
        key: "datoriiTotale",
        label: "Datorii Total",
        aliases: ["datorii total", "datoriitotal", "datorii_totale", "total_liabilities"],
    },
    {
        key: "casaSiConturiBanci",
        label: "Casa și conturi la bănci",
        aliases: [
            "casa si conturi la banci",
            "casasiconturilabanci",
            "casa_si_conturi_banci",
            "cash_and_bank",
        ],
    },
    { key: "provizioane", label: "Provizioane", aliases: ["provizioane", "provisions"] },
    {
        key: "venituriInAvans",
        label: "Venituri în avans",
        aliases: ["venituri in avans", "venituriinavans", "venituri_in_avans", "deferred_revenue"],
    },
    {
        key: "numarAngajati",
        label: "Număr mediu de salariați",
        aliases: [
            "numar mediu de salariati",
            "numarmediudesalariati",
            "numar_angajati",
            "employees",
            "nr_angajati",
        ],
    },
    {
        key: "anulInfiintarii",
        label: "Anul înființării",
        aliases: [
            "anul infiintarii calculat",
            "anulinfiintariicalculat",
            "anul_infiintarii",
            "year_founded",
        ],
    },
    {
        key: "ratingExtern",
        label: "Rating extern",
        aliases: ["rating", "rating_extern", "external_rating", "credit_rating"],
    },
    {
        key: "limitaCreditEur",
        label: "Limita de credit (EUR)",
        aliases: ["limita de credit (eur)", "limitadecrediteur", "limita_credit_eur", "credit_limit"],
    },
];
/**
 * Build a Map<normalizedAlias, canonicalKey> from COLUMN_MAPPING_DEFINITIONS.
 * Used by ingest-utils for auto-detecting column mappings from headers.
 */
export function buildColumnAliasToTargetMap(normalizeFn) {
    return new Map(COLUMN_MAPPING_DEFINITIONS.flatMap((entry) => entry.aliases.map((alias) => [normalizeFn(alias), entry.key])));
}
//# sourceMappingURL=column-mapping.js.map