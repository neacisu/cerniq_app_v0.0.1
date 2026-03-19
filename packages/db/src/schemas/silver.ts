import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { users } from "./users.js";
import { bronzeContacts } from "./bronze.js";
import { geographyPoint } from "./postgis.js";

export const silverSchema = pgSchema("silver");

export const enrichmentStatusEnum = pgEnum("enrichment_status", [
  "pending",
  "in_progress",
  "complete",
  "partial",
  "failed",
]);

export const promotionStatusEnum = pgEnum("promotion_status", [
  "eligible",
  "review_required",
  "blocked",
  "promoted",
]);

export const companyStatusEnum = pgEnum("company_status", [
  "ACTIVA",
  "INACTIVA",
  "DIZOLVARE",
  "RADIATA",
  "INSOLVENTA",
  "UNKNOWN",
]);

export const formaJuridicaEnum = pgEnum("forma_juridica", [
  "SRL",
  "SA",
  "PFA",
  "II",
  "IF",
  "SNC",
  "SCS",
  "ONG",
  "COOP",
  "OTHER",
]);

export const dedupStatusEnum = pgEnum("dedup_status", [
  "pending",
  "auto_merged",
  "hitl_pending",
  "merged",
  "rejected",
  "expired",
]);

export const locationTypeEnum = pgEnum("location_type", [
  "SEDIU_SOCIAL",
  "PUNCT_LUCRU",
  "SUCURSALA",
  "DEPOZIT",
  "FERMA",
]);

export const silverIdentityStatusEnum = pgEnum("silver_identity_status", [
  "resolved",
  "partial",
  "identity_conflict",
]);

export const companyIdentityKeyTypeEnum = pgEnum("company_identity_key_type", [
  "cui",
  "nr_reg_com",
]);

export const companyIdentitySourceAuthorityEnum = pgEnum("company_identity_source_authority", [
  "import",
  "anaf",
  "onrc",
  "manual",
  "migration",
]);

export const silverCompanies = silverSchema.table(
  "silver_companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceBronzeId: uuid("source_bronze_id").references(() => bronzeContacts.id, {
      onDelete: "set null",
    }),

    // --- IDENTIFICATORI FISCALI ---
    cui: varchar("cui", { length: 32 }),
    cuiValidated: boolean("cui_validated").notNull().default(false),
    cuiValidationDate: timestamp("cui_validation_date", { withTimezone: true }),
    cuiValidationSource: varchar("cui_validation_source", { length: 50 }),
    cuiRo: varchar("cui_ro", { length: 34 }).generatedAlwaysAs(
      sql`CASE WHEN "cui" IS NOT NULL THEN 'RO' || "cui" ELSE NULL END`,
    ),
    nrRegCom: varchar("nr_reg_com", { length: 32 }),
    nrRegComOriginal: varchar("nr_reg_com_original", { length: 32 }),
    nrRegComCanonical: varchar("nr_reg_com_canonical", { length: 20 }),
    identityStatus: silverIdentityStatusEnum("identity_status").notNull().default("partial"),
    identityMetadata: jsonb("identity_metadata").notNull().default({}),

    // --- DENUMIRE ---
    denumire: varchar("denumire", { length: 255 }),
    denumireNormalizata: varchar("denumire_normalizata", { length: 255 }).generatedAlwaysAs(
      sql`UPPER(TRIM(REGEXP_REPLACE(COALESCE("denumire", ''), '\s+', ' ', 'g')))`,
    ),
    denumireComerciala: varchar("denumire_comerciala", { length: 255 }),
    formaJuridica: formaJuridicaEnum("forma_juridica"),

    // --- ADRESĂ SEDIU SOCIAL ---
    adresa: text("adresa"),
    adresaNormalizata: text("adresa_normalizata"),
    strada: varchar("strada", { length: 200 }),
    numar: varchar("numar", { length: 20 }),
    bloc: varchar("bloc", { length: 20 }),
    scara: varchar("scara", { length: 10 }),
    etaj: varchar("etaj", { length: 10 }),
    apartament: varchar("apartament", { length: 10 }),
    codPostal: varchar("cod_postal", { length: 10 }),
    localitate: varchar("localitate", { length: 100 }),
    comuna: varchar("comuna", { length: 100 }),
    judet: varchar("judet", { length: 100 }),
    judetCod: varchar("judet_cod", { length: 2 }),
    codSiruta: integer("cod_siruta"),
    detaliiAdresa: text("detalii_adresa"),

    // --- ADRESĂ DOMICILIU FISCAL ---
    adresaDomiciliuFiscal: jsonb("adresa_domiciliu_fiscal"),

    // --- COORDONATE ---
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    locationGeography: geographyPoint("location_geography"),
    geocodingAccuracy: varchar("geocoding_accuracy", { length: 30 }),
    geocodingSource: varchar("geocoding_source", { length: 30 }),

    // --- DATE FISCALE (ANAF) ---
    statusFirma: companyStatusEnum("status_firma"),
    stareInregistrare: text("stare_inregistrare"),
    dataInregistrare: date("data_inregistrare"),
    dataRadiere: date("data_radiere"),
    dataSuspendare: date("data_suspendare"),
    dataInactivare: date("data_inactivare"),
    dataReactivare: date("data_reactivare"),
    actInfiintare: text("act_infiintare"),
    organFiscalCompetent: varchar("organ_fiscal_competent", { length: 255 }),
    formaDeProprietate: varchar("forma_de_proprietate", { length: 255 }),
    formaOrganizare: varchar("forma_organizare", { length: 255 }),

    // --- TVA ---
    platitorTva: boolean("platitor_tva"),
    dataInceputTva: date("data_inceput_tva"),
    dataSfarsitTva: date("data_sfarsit_tva"),
    periodeTva: jsonb("perioade_tva"),
    tvaLaIncasare: boolean("tva_la_incasare").notNull().default(false),
    dataInceputTvaIncasare: date("data_inceput_tva_incasare"),
    dataSfarsitTvaIncasare: date("data_sfarsit_tva_incasare"),
    splitTva: boolean("split_tva").notNull().default(false),
    dataInceputSplitTva: date("data_inceput_split_tva"),
    dataAnulareSplitTva: date("data_anulare_split_tva"),

    // --- E-FACTURA ---
    inregistratEfactura: boolean("inregistrat_e_factura").notNull().default(false),
    dataInregistrareEfactura: date("data_inregistrare_e_factura"),

    // --- CONTACT ANAF ---
    fax: varchar("fax", { length: 32 }),
    iban: varchar("iban", { length: 34 }),

    // --- CAEN ---
    codCaenPrincipal: varchar("cod_caen_principal", { length: 8 }),
    denumireCaen: varchar("denumire_caen", { length: 255 }),
    coduriCaenSecundare: jsonb("coduri_caen_secundare").notNull().default([]),

    // --- DATE FINANCIARE (TERMENE.RO / EXCEL) ---
    cifraAfaceri: numeric("cifra_afaceri", { precision: 18, scale: 2 }),
    profitNet: numeric("profit_net", { precision: 18, scale: 2 }),
    profitBrut: numeric("profit_brut", { precision: 18, scale: 2 }),
    venituriTotale: numeric("venituri_totale", { precision: 18, scale: 2 }),
    cheltuieliTotale: numeric("cheltuieli_totale", { precision: 18, scale: 2 }),
    numarAngajati: integer("numar_angajati"),
    capitaluriProprii: numeric("capitaluri_proprii", { precision: 18, scale: 2 }),
    capitalSocial: numeric("capital_social", { precision: 15, scale: 2 }),
    datoriiTotale: numeric("datorii_totale", { precision: 18, scale: 2 }),
    activeTotale: numeric("active_totale", { precision: 18, scale: 2 }),
    activeImobilizate: numeric("active_imobilizate", { precision: 18, scale: 2 }),
    activeCirculante: numeric("active_circulante", { precision: 18, scale: 2 }),
    creante: numeric("creante", { precision: 18, scale: 2 }),
    stocuri: numeric("stocuri", { precision: 18, scale: 2 }),
    cheltuieliInAvans: numeric("cheltuieli_in_avans", { precision: 18, scale: 2 }),
    casaSiConturiBanci: numeric("casa_si_conturi_banci", { precision: 18, scale: 2 }),
    provizioane: numeric("provizioane", { precision: 18, scale: 2 }),
    venituriInAvans: numeric("venituri_in_avans", { precision: 18, scale: 2 }),
    anBilant: integer("an_bilant"),
    anulInfiintarii: integer("anul_infiintarii"),
    scorRiscTermene: integer("scor_risc_termene"),
    categorieRisc: varchar("categorie_risc", { length: 20 }),
    ratingExtern: integer("rating_extern"),
    limitaCreditEur: numeric("limita_credit_eur", { precision: 15, scale: 2 }),

    // --- DATORII ANAF (SUMAR) ---
    datoriiAnaf: numeric("datorii_anaf", { precision: 15, scale: 2 }),
    datoriiAnafData: date("datorii_anaf_data"),
    obligatiiBugetStat: numeric("obligatii_buget_stat", { precision: 15, scale: 2 }),
    obligatiiBugetSomaj: numeric("obligatii_buget_somaj", { precision: 15, scale: 2 }),
    obligatiiBugetAsigSociale: numeric("obligatii_buget_asig_sociale", { precision: 15, scale: 2 }),
    obligatiiBugetSanatate: numeric("obligatii_buget_sanatate", { precision: 15, scale: 2 }),

    // --- BPI (SUMAR INSOLVENȚĂ) ---
    bpiNumarActe: integer("bpi_numar_acte").notNull().default(0),
    bpiDataUltimaModificare: date("bpi_data_ultima_modificare"),
    bpiInInsolventa: boolean("bpi_in_insolventa").notNull().default(false),

    // --- CIP (SUMAR INCIDENTE PLĂȚI) ---
    cipTotalIncidente: integer("cip_total_incidente").notNull().default(0),
    cipIncidenteMajore: integer("cip_incidente_majore").notNull().default(0),
    cipSumaRefuzata: numeric("cip_suma_refuzata", { precision: 18, scale: 2 }),
    cipDataUltimulIncident: date("cip_data_ultimul_incident"),

    // --- DOSARE (SUMAR) ---
    numarDosareActuale: integer("numar_dosare_actuale").notNull().default(0),
    inInsolventa: boolean("in_insolventa").notNull().default(false),

    // --- CONTACT ---
    email: varchar("email", { length: 320 }),
    telefon: varchar("telefon", { length: 32 }),
    website: varchar("website", { length: 255 }),

    // --- ENRICHMENT TRACKING ---
    enrichmentStatus: enrichmentStatusEnum("enrichment_status").notNull().default("pending"),
    enrichmentSourcesCompleted: jsonb("enrichment_sources_completed").notNull().default([]),
    enrichmentErrors: jsonb("enrichment_errors").notNull().default({}),
    lastEnrichedAt: timestamp("last_enriched_at", { withTimezone: true }),
    nextEnrichmentAt: timestamp("next_enrichment_at", { withTimezone: true }),

    // --- QUALITY SCORING ---
    completenessScore: numeric("completeness_score", { precision: 5, scale: 2 }),
    accuracyScore: numeric("accuracy_score", { precision: 5, scale: 2 }),
    freshnessScore: numeric("freshness_score", { precision: 5, scale: 2 }),
    totalQualityScore: numeric("total_quality_score", { precision: 5, scale: 2 }),
    qualityIssues: jsonb("quality_issues").notNull().default([]),

    // --- PROMOTION TO GOLD ---
    promotionStatus: promotionStatusEnum("promotion_status").notNull().default("blocked"),
    promotionBlockedReason: text("promotion_blocked_reason"),
    promotedToGoldId: uuid("promoted_to_gold_id"),
    promotedAt: timestamp("promoted_at", { withTimezone: true }),

    // --- DEDUPLICARE ---
    dedupStatus: dedupStatusEnum("dedup_status").notNull().default("pending"),
    isMasterRecord: boolean("is_master_record").notNull().default(true),
    masterRecordId: uuid("master_record_id"),
    duplicateConfidence: numeric("duplicate_confidence", { precision: 5, scale: 4 }),
    mergeHistory: jsonb("merge_history").notNull().default([]),

    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_silver_companies_cui_tenant")
      .on(t.tenantId, t.cui)
      .where(sql`${t.cui} IS NOT NULL AND ${t.isMasterRecord} = TRUE`),
    uniqueIndex("idx_silver_companies_nrregcom_tenant")
      .on(t.tenantId, t.nrRegCom)
      .where(sql`${t.nrRegCom} IS NOT NULL AND ${t.isMasterRecord} = TRUE`),
    index("idx_silver_companies_enrichment")
      .on(t.tenantId, t.enrichmentStatus, t.lastEnrichedAt)
      .where(sql`${t.enrichmentStatus} IN ('pending', 'partial')`),
    index("idx_silver_companies_promotion")
      .on(t.tenantId, t.promotionStatus, t.totalQualityScore)
      .where(sql`${t.promotionStatus} = 'eligible'`),
    index("idx_silver_companies_status").on(t.tenantId, t.statusFirma),
    index("idx_silver_companies_caen").on(t.codCaenPrincipal),
    index("idx_silver_companies_quality").on(t.tenantId, t.totalQualityScore),
    index("idx_silver_companies_cui").on(t.cui),
    index("idx_silver_companies_identity_status").on(t.tenantId, t.identityStatus),
  ],
);

export const companyIdentityKeys = silverSchema.table(
  "company_identity_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "cascade" }),
    keyType: companyIdentityKeyTypeEnum("key_type").notNull(),
    keyValueCanonical: varchar("key_value_canonical", { length: 64 }).notNull(),
    keyValueOriginal: varchar("key_value_original", { length: 64 }),
    sourceAuthority: companyIdentitySourceAuthorityEnum("source_authority")
      .notNull()
      .default("import"),
    isAuthoritative: boolean("is_authoritative").notNull().default(false),
    sourceBronzeId: uuid("source_bronze_id").references(() => bronzeContacts.id, {
      onDelete: "set null",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_company_identity_keys_unique_active")
      .on(t.tenantId, t.keyType, t.keyValueCanonical)
      .where(sql`${t.revokedAt} IS NULL`),
    index("idx_company_identity_keys_company").on(t.companyId),
    index("idx_company_identity_keys_lookup").on(t.tenantId, t.keyType, t.keyValueCanonical),
  ],
);

export const silverContacts = silverSchema.table(
  "silver_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "cascade" }),

    // --- NUME ---
    prenume: varchar("prenume", { length: 120 }),
    nume: varchar("nume", { length: 120 }),
    numeComplet: varchar("nume_complet", { length: 255 }).generatedAlwaysAs(
      sql`TRIM(COALESCE("prenume", '') || ' ' || COALESCE("nume", ''))`,
    ),

    // --- EMAIL ---
    email: varchar("email", { length: 320 }),
    emailNormalized: varchar("email_normalized", { length: 320 }).generatedAlwaysAs(
      sql`LOWER(TRIM(COALESCE("email", '')))`,
    ),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailValidationDate: timestamp("email_validation_date", { withTimezone: true }),
    emailValidationSource: varchar("email_validation_source", { length: 30 }),
    emailDeliverability: varchar("email_deliverability", { length: 20 }),
    emailProvider: varchar("email_provider", { length: 50 }),
    emailCatchAll: boolean("email_catch_all"),
    emailRoleBased: boolean("email_role_based"),

    // --- TELEFON ---
    telefon: varchar("telefon", { length: 32 }),
    telefonE164: varchar("telefon_e164", { length: 32 }),
    telefonValid: boolean("telefon_valid"),
    telefonValidationDate: timestamp("telefon_validation_date", { withTimezone: true }),
    telefonCarrier: varchar("telefon_carrier", { length: 50 }),
    telefonType: varchar("telefon_type", { length: 20 }),
    telefonSecundar: varchar("telefon_secundar", { length: 20 }),
    whatsappNumber: varchar("whatsapp_number", { length: 32 }),
    whatsappAvailable: boolean("whatsapp_available"),
    whatsappVerifiedAt: timestamp("whatsapp_verified_at", { withTimezone: true }),

    // --- PROFESIONAL ---
    functie: varchar("functie", { length: 120 }),
    functieNormalizata: varchar("functie_normalizata", { length: 120 }),
    departament: varchar("departament", { length: 50 }),
    seniority: varchar("seniority", { length: 50 }),
    isDecisionMaker: boolean("is_decision_maker").notNull().default(false),
    linkedinUrl: varchar("linkedin_url", { length: 500 }),
    linkedinVerified: boolean("linkedin_verified"),

    // --- SURSĂ ȘI GDPR ---
    dataSource: varchar("data_source", { length: 50 }),
    legalBasis: varchar("legal_basis", { length: 50 }),
    liaDocumented: boolean("lia_documented").notNull().default(false),
    consentDate: timestamp("consent_date", { withTimezone: true }),

    // --- QUALITY & ENRICHMENT ---
    completenessScore: integer("completeness_score").notNull().default(0),
    enrichmentStatus: enrichmentStatusEnum("enrichment_status").notNull().default("pending"),
    enrichmentSources: jsonb("enrichment_sources").notNull().default([]),
    isPrimary: boolean("is_primary").notNull().default(false),

    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_silver_contacts_company").on(t.companyId),
    uniqueIndex("idx_silver_contacts_email_tenant")
      .on(t.tenantId, t.companyId, t.emailNormalized)
      .where(sql`${t.emailNormalized} <> ''`),
    index("idx_silver_contacts_phone").on(t.telefonE164),
    index("idx_silver_contacts_primary").on(t.companyId, t.isPrimary),
  ],
);

export const silverEnrichmentLog = silverSchema.table(
  "silver_enrichment_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 32 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    source: varchar("source", { length: 50 }).notNull(),
    operation: varchar("operation", { length: 100 }).notNull(),
    status: varchar("status", { length: 20 }),
    errorMessage: text("error_message"),
    errorCode: varchar("error_code", { length: 50 }),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    fieldsUpdated: jsonb("fields_updated").notNull().default([]),
    previousValues: jsonb("previous_values"),
    newValues: jsonb("new_values"),
    correlationId: varchar("correlation_id", { length: 100 }),
    jobId: varchar("job_id", { length: 100 }),
    durationMs: integer("duration_ms"),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_silver_enrich_log_entity").on(t.tenantId, t.entityType, t.entityId),
    index("idx_silver_enrich_log_source").on(t.source),
    index("idx_silver_enrich_log_correlation").on(t.correlationId),
    index("idx_silver_enrich_log_job").on(t.jobId),
  ],
);

export const silverDedupCandidates = silverSchema.table(
  "silver_dedup_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyAId: uuid("company_a_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "cascade" }),
    companyBId: uuid("company_b_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "cascade" }),
    nameSimilarity: numeric("name_similarity", { precision: 5, scale: 4 }),
    addressSimilarity: numeric("address_similarity", { precision: 5, scale: 4 }),
    cuiMatch: boolean("cui_match").notNull().default(false),
    phoneMatch: boolean("phone_match").notNull().default(false),
    overallConfidence: numeric("overall_confidence", { precision: 5, scale: 4 }).notNull(),
    matchingFields: jsonb("matching_fields"),
    status: dedupStatusEnum("status").notNull().default("pending"),
    decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
    decisionReason: text("decision_reason"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    masterCompanyId: uuid("master_company_id").references(() => silverCompanies.id, {
      onDelete: "set null",
    }),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("idx_silver_dedup_pair").on(t.tenantId, t.companyAId, t.companyBId),
    index("idx_silver_dedup_pending")
      .on(t.tenantId, t.status, t.overallConfidence)
      .where(sql`${t.status} IN ('pending', 'hitl_pending')`),
  ],
);

export const silverCompanyLocations = silverSchema.table(
  "silver_company_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "cascade" }),
    tipLocatie: locationTypeEnum("tip_locatie").notNull().default("SEDIU_SOCIAL"),
    cui: varchar("cui", { length: 32 }),
    adresa: text("adresa").notNull(),
    localitate: varchar("localitate", { length: 100 }),
    judet: varchar("judet", { length: 100 }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    locationGeography: geographyPoint("location_geography"),
    suprafataHa: numeric("suprafata_ha", { precision: 12, scale: 2 }),
    culturi: jsonb("culturi").notNull().default([]),
    source: varchar("source", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_silver_locations_company").on(t.companyId),
    index("idx_silver_locations_cui").on(t.tenantId, t.cui),
  ],
);

// ═══════════════════════════════════════════════════════════════════════════
// TABELE RELAȚIONALE DETALIU (Excel Tab 2-10)
// ═══════════════════════════════════════════════════════════════════════════

export const silverDatoriiAnaf = silverSchema.table(
  "silver_datorii_anaf",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "cascade" }),
    tipBuget: varchar("tip_buget", { length: 100 }).notNull(),
    sumaRestanta: numeric("suma_restanta", { precision: 15, scale: 2 }),
    dataVerificare: date("data_verificare"),
    sursa: varchar("sursa", { length: 50 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_silver_datorii_anaf_company").on(t.companyId),
    index("idx_silver_datorii_anaf_tenant").on(t.tenantId),
  ],
);

export const silverBpiActe = silverSchema.table(
  "silver_bpi_acte",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "cascade" }),
    tipAct: varchar("tip_act", { length: 100 }),
    numarAct: varchar("numar_act", { length: 50 }),
    dataAct: date("data_act"),
    instanta: varchar("instanta", { length: 200 }),
    numarDosar: varchar("numar_dosar", { length: 50 }),
    stare: varchar("stare", { length: 50 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_silver_bpi_acte_company").on(t.companyId),
    index("idx_silver_bpi_acte_tenant").on(t.tenantId),
  ],
);

export const silverCipIncidente = silverSchema.table(
  "silver_cip_incidente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "cascade" }),
    tipInstrument: varchar("tip_instrument", { length: 50 }),
    serieNumar: varchar("serie_numar", { length: 50 }),
    sumaRefuzata: numeric("suma_refuzata", { precision: 18, scale: 2 }),
    dataRefuz: date("data_refuz"),
    motivRefuz: varchar("motiv_refuz", { length: 200 }),
    institutieFinanciara: varchar("institutie_financiara", { length: 200 }),
    esteMajor: boolean("este_major").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_silver_cip_incidente_company").on(t.companyId),
    index("idx_silver_cip_incidente_tenant").on(t.tenantId),
  ],
);

export const silverDosare = silverSchema.table(
  "silver_dosare",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "cascade" }),
    numarDosar: varchar("numar_dosar", { length: 50 }),
    instanta: varchar("instanta", { length: 200 }),
    categorieDosar: varchar("categorie_dosar", { length: 100 }),
    obiectDosar: text("obiect_dosar"),
    stadiu: varchar("stadiu", { length: 50 }),
    dataUltimaModificare: timestamp("data_ultima_modificare", { withTimezone: true }),
    calitateParte: varchar("calitate_parte", { length: 50 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_silver_dosare_company").on(t.companyId),
    index("idx_silver_dosare_tenant").on(t.tenantId),
  ],
);

export const silverPartiDosare = silverSchema.table(
  "silver_parti_dosare",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    dosarId: uuid("dosar_id")
      .notNull()
      .references(() => silverDosare.id, { onDelete: "cascade" }),
    numeParte: varchar("nume_parte", { length: 255 }),
    calitate: varchar("calitate", { length: 50 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_silver_parti_dosare_dosar").on(t.dosarId)],
);

export const silverTermeneDosare = silverSchema.table(
  "silver_termene_dosare",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    dosarId: uuid("dosar_id")
      .notNull()
      .references(() => silverDosare.id, { onDelete: "cascade" }),
    dataTermen: date("data_termen"),
    oraTermen: varchar("ora_termen", { length: 10 }),
    solutie: text("solutie"),
    documenteSolutie: text("documente_solutie"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_silver_termene_dosare_dosar").on(t.dosarId)],
);
