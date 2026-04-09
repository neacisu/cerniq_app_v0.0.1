import {
  boolean,
  check,
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
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenants.js";
import { users } from "./users.js";
import { silverCompanies } from "./silver.js";
import { bronzeContacts } from "./bronze.js";
import { geographyPoint } from "./postgis.js";
import { halfvec } from "./pgvector.js";

export const goldSchema = pgSchema("gold");

export const riskCategoryEnum = pgEnum("risk_category", ["LOW", "MEDIUM", "HIGH"]);
export const contactRoleEnum = pgEnum("contact_role", [
  "ADMINISTRATOR",
  "ACTIONAR",
  "CONTACT",
  "ASOCIAT",
  "REPREZENTANT",
]);
export const errorSeverityEnum = pgEnum("error_severity", ["warning", "error", "critical"]);

const leadStates = [
  "COLD",
  "CONTACTED_WA",
  "CONTACTED_EMAIL",
  "CONTACTED_PHONE",
  "WARM_REPLY",
  "ENGAGED",
  "NEGOTIATION",
  "PROPOSAL",
  "CLOSING",
  "CONVERTED",
  "ONBOARDING",
  "NURTURING_ACTIVE",
  "AT_RISK",
  "LOYAL_ADVOCATE",
  "CHURNED",
  "DEAD",
  "DO_NOT_CONTACT",
] as const;

export const goldCompanies = goldSchema.table(
  "gold_companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    silverId: uuid("silver_id")
      .notNull()
      .references(() => silverCompanies.id, { onDelete: "restrict" }),
    bronzeIds: uuid("bronze_ids").array().notNull().default([]),

    // --- SECȚIUNEA 1: IDENTIFICATORI ---
    cui: varchar("cui", { length: 32 }).notNull(),
    cuiRo: varchar("cui_ro", { length: 34 }).generatedAlwaysAs(
      sql`CASE WHEN "cui" IS NOT NULL THEN 'RO' || "cui" ELSE NULL END`,
    ),
    nrRegCom: varchar("nr_reg_com", { length: 20 }),
    ibanPrincipal: varchar("iban_principal", { length: 34 }),

    // --- DENUMIRI ---
    denumire: varchar("denumire", { length: 255 }),
    denumireComerciala: varchar("denumire_comerciala", { length: 255 }),
    denumireNormalizata: varchar("denumire_normalizata", { length: 255 }),
    formaJuridica: varchar("forma_juridica", { length: 20 }),
    tipEntitate: varchar("tip_entitate", { length: 30 }),

    // --- SECȚIUNEA 2: DATE JURIDICE ȘI FISCALE ---
    statusFirma: varchar("status_firma", { length: 30 }),
    dataInregistrare: date("data_inregistrare"),
    dataRadiere: date("data_radiere"),
    platitorTva: boolean("platitor_tva").notNull().default(false),
    dataInceputTva: date("data_inceput_tva"),
    dataSfarsitTva: date("data_sfarsit_tva"),
    tvaLaIncasare: boolean("tva_la_incasare").notNull().default(false),
    splitTva: boolean("split_tva").notNull().default(false),
    inregistratEfactura: boolean("inregistrat_e_factura").notNull().default(false),
    dataInregistrareEfactura: date("data_inregistrare_e_factura"),
    codCaenPrincipal: varchar("cod_caen_principal", { length: 8 }),
    denumireCaen: varchar("denumire_caen", { length: 255 }),
    coduriCaenSecundare: jsonb("coduri_caen_secundare").notNull().default([]),
    isAgricultural: boolean("is_agricultural").generatedAlwaysAs(
      sql`"cod_caen_principal" LIKE '01%' OR "cod_caen_principal" LIKE '02%' OR "cod_caen_principal" LIKE '03%'`,
    ),
    capitalSocial: numeric("capital_social", { precision: 15, scale: 2 }),

    // --- SECȚIUNEA 3: DATE AGRICOLE ---
    suprafataTotalaHa: numeric("suprafata_totala_ha", { precision: 10, scale: 2 }),
    suprafataArendataHa: numeric("suprafata_arendata_ha", { precision: 10, scale: 2 }),
    suprafataProprieHa: numeric("suprafata_proprie_ha", { precision: 10, scale: 2 }),
    suprafataIrigataHa: numeric("suprafata_irigata_ha", { precision: 10, scale: 2 }),
    tipExploatatie: varchar("tip_exploatatie", { length: 30 }),
    categoriaDimensiune: varchar("categorie_dimensiune", { length: 30 }),
    culturiPrincipale: jsonb("culturi_principale").notNull().default([]),
    efectivAnimale: jsonb("efectiv_animale").notNull().default({}),
    totalLsu: numeric("total_lsu", { precision: 10, scale: 2 }),
    echipamenteAgricole: jsonb("echipamente_agricole").notNull().default([]),
    capacitateStocareT: numeric("capacitate_stocare_tone", { precision: 10, scale: 2 }),
    sistemIrigare: varchar("sistem_irigare", { length: 50 }),
    subventiiApiaUltimulAn: numeric("subventii_apia_ultimul_an", { precision: 15, scale: 2 }),
    tipSubventii: jsonb("tip_subventii").notNull().default([]),
    certificatEco: boolean("certificat_eco").notNull().default(false),
    certificatGlobalgap: boolean("certificat_globalgap").notNull().default(false),
    alteCertificari: jsonb("alte_certificari").notNull().default([]),

    // --- SECȚIUNEA 4: LOCAȚIE ȘI GEOGRAFIE ---
    adresa: text("adresa"),
    strada: varchar("strada", { length: 200 }),
    numar: varchar("numar", { length: 20 }),
    codPostal: varchar("cod_postal", { length: 10 }),
    localitate: varchar("localitate", { length: 100 }),
    comuna: varchar("comuna", { length: 100 }),
    judet: varchar("judet", { length: 50 }),
    judetCod: varchar("judet_cod", { length: 10 }),
    codSiruta: integer("cod_siruta"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    locationGeography: geographyPoint("location_geography"),
    zonaAgricola: varchar("zona_agricola", { length: 50 }),
    bazinHidrografic: varchar("bazin_hidrografic", { length: 100 }),
    nearestDepotKm: numeric("nearest_depot_km", { precision: 8, scale: 2 }),
    nearestCompetitorKm: numeric("nearest_competitor_km", { precision: 8, scale: 2 }),
    zonaLivrare: varchar("zona_livrare", { length: 50 }),

    // --- SECȚIUNEA 5: DATE FINANCIARE ȘI CREDIT ---
    cifraAfaceri: numeric("cifra_afaceri", { precision: 18, scale: 2 }),
    profitNet: numeric("profit_net", { precision: 18, scale: 2 }),
    profitBrut: numeric("profit_brut", { precision: 18, scale: 2 }),
    venituriTotale: numeric("venituri_totale", { precision: 18, scale: 2 }),
    cheltuieliTotale: numeric("cheltuieli_totale", { precision: 18, scale: 2 }),
    activeTotale: numeric("active_totale", { precision: 18, scale: 2 }),
    activeImobilizate: numeric("active_imobilizate", { precision: 18, scale: 2 }),
    activeCirculante: numeric("active_circulante", { precision: 18, scale: 2 }),
    creante: numeric("creante", { precision: 18, scale: 2 }),
    stocuri: numeric("stocuri", { precision: 18, scale: 2 }),
    cheltuieliInAvans: numeric("cheltuieli_in_avans", { precision: 18, scale: 2 }),
    casaSiConturiBanci: numeric("casa_si_conturi_banci", { precision: 18, scale: 2 }),
    datoriiTotale: numeric("datorii_totale", { precision: 18, scale: 2 }),
    capitaluriProprii: numeric("capitaluri_proprii", { precision: 18, scale: 2 }),
    provizioane: numeric("provizioane", { precision: 18, scale: 2 }),
    venituriInAvans: numeric("venituri_in_avans", { precision: 18, scale: 2 }),
    numarAngajati: integer("numar_angajati"),
    anBilant: integer("an_bilant"),
    anulInfiintarii: integer("anul_infiintarii"),
    ratingExtern: integer("rating_extern"),
    limitaCreditEur: numeric("limita_credit_eur", { precision: 15, scale: 2 }),
    lichiditateCurenta: numeric("lichiditate_curenta", { precision: 8, scale: 4 }),
    gradIndatorare: numeric("grad_indatorare", { precision: 8, scale: 4 }),
    marjaProfit: numeric("marja_profit", { precision: 8, scale: 4 }),

    // --- DATORII ANAF ---
    datoriiAnaf: numeric("datorii_anaf", { precision: 15, scale: 2 }).notNull().default("0"),
    dataVerificareDatorii: date("data_verificare_datorii"),
    obligatiiBugetStat: numeric("obligatii_buget_stat", { precision: 15, scale: 2 }),
    obligatiiBugetSomaj: numeric("obligatii_buget_somaj", { precision: 15, scale: 2 }),
    obligatiiBugetAsigSociale: numeric("obligatii_buget_asig_sociale", { precision: 15, scale: 2 }),
    obligatiiBugetSanatate: numeric("obligatii_buget_sanatate", { precision: 15, scale: 2 }),

    // --- BPI (INSOLVENȚĂ) ---
    bpiNumarActe: integer("bpi_numar_acte").notNull().default(0),
    bpiInInsolventa: boolean("bpi_in_insolventa").notNull().default(false),

    // --- CIP (INCIDENTE PLĂȚI) ---
    cipTotalIncidente: integer("cip_total_incidente").notNull().default(0),
    cipIncidenteMajore: integer("cip_incidente_majore").notNull().default(0),
    cipSumaRefuzata: numeric("cip_suma_refuzata", { precision: 18, scale: 2 }),

    // --- DOSARE ---
    numarDosareActuale: integer("numar_dosare_actuale").notNull().default(0),
    inInsolventa: boolean("in_insolventa").notNull().default(false),
    scorRiscIntern: integer("scor_risc_intern"),
    scorRiscTermene: integer("scor_risc_termene"),
    categorieRisc: varchar("categorie_risc", { length: 20 }).notNull().default("MEDIUM"),
    limitaCreditCalculata: numeric("limita_credit_calculata", { precision: 15, scale: 2 }),
    limitaCreditAprobata: numeric("limita_credit_aprobata", { precision: 15, scale: 2 }),
    termenPlataStandard: integer("termen_plata_standard").notNull().default(0),
    conditiiPlata: varchar("conditii_plata", { length: 30 }).notNull().default("RAMBURS"),

    // --- SECȚIUNEA 6: LEAD SCORING ȘI ENGAGEMENT ---
    leadScore: numeric("lead_score", { precision: 5, scale: 2 }),
    fitScore: numeric("fit_score", { precision: 5, scale: 2 }),
    engagementScore: numeric("engagement_score", { precision: 5, scale: 2 }),
    intentScore: numeric("intent_score", { precision: 5, scale: 2 }),
    scoreFirmografic: integer("score_firmografic").notNull().default(0),
    scoreComportamental: integer("score_comportamental").notNull().default(0),
    scoreInteres: integer("score_interes").notNull().default(0),
    dataCalculScor: timestamp("data_calcul_scor", { withTimezone: true }),

    // FSM
    currentState: varchar("current_state", { length: 30 }).notNull().default("COLD"),
    previousState: varchar("previous_state", { length: 30 }),
    stateChangedAt: timestamp("state_changed_at", { withTimezone: true }).notNull().defaultNow(),
    stateHistory: jsonb("state_history").notNull().default([]),
    dataPrimaContactare: timestamp("data_prima_contactare", { withTimezone: true }),
    dataUltimaInteractiune: timestamp("data_ultima_interactiune", { withTimezone: true }),
    numarInteractiuniTotale: integer("numar_interactiuni_totale").notNull().default(0),

    // Preferințe
    canalPreferat: varchar("canal_preferat", { length: 20 }),
    oraPreferataContact: varchar("ora_preferata_contact", { length: 10 }),
    zilePreferate: jsonb("zile_preferate_contact").notNull().default([]),

    // Metrici recente
    emailOpens30Zile: integer("email_opens_30_zile").notNull().default(0),
    emailClicks30Zile: integer("email_clicks_30_zile").notNull().default(0),
    waMessagesSent30Zile: integer("wa_messages_sent_30_zile").notNull().default(0),
    waReplies30Zile: integer("wa_replies_30_zile").notNull().default(0),
    calls30Zile: integer("calls_30_zile").notNull().default(0),

    // --- SECȚIUNEA 7: RELAȚII ȘI ASOCIERI ---
    actionari: jsonb("actionari").notNull().default([]),
    administratori: jsonb("administratori").notNull().default([]),
    membruOuai: boolean("membru_ouai").notNull().default(false),
    ouaiId: uuid("ouai_id"),
    ouaiNume: varchar("ouai_nume", { length: 200 }),
    membruCooperativa: boolean("membru_cooperativa").notNull().default(false),
    cooperativaId: uuid("cooperativa_id"),
    cooperativaNume: varchar("cooperativa_nume", { length: 200 }),
    membruGrupProducatori: boolean("membru_grup_producatori").notNull().default(false),
    grupProducatoriId: uuid("grup_producatori_id"),
    asociatiiProfesionale: jsonb("asociatii_profesionale").notNull().default([]),

    // --- SECȚIUNEA 8: GDPR ---
    gdprLegalBasis: varchar("gdpr_legal_basis", { length: 30 }).default("LEGITIMATE_INTEREST"),
    gdprLiaDocumentat: boolean("gdpr_lia_documentat").notNull().default(true),
    gdprDataLia: date("gdpr_data_lia"),
    consentEmailMarketing: boolean("consent_email_marketing").notNull().default(true),
    consentWhatsapp: boolean("consent_whatsapp").notNull().default(true),
    consentTelefon: boolean("consent_telefon").notNull().default(true),
    consentDate: timestamp("consent_date", { withTimezone: true }),
    doNotContact: boolean("do_not_contact").notNull().default(false),
    doNotEmail: boolean("do_not_email").notNull().default(false),
    doNotCall: boolean("do_not_call").notNull().default(false),
    doNotWhatsapp: boolean("do_not_whatsapp").notNull().default(false),

    // --- SECȚIUNEA 9: AI/ML ---
    aiEmbedding: halfvec("ai_embedding", { dimensions: 3072 }),
    embeddingUpdatedAt: timestamp("embedding_updated_at", { withTimezone: true }),
    segmentAi: varchar("segment_ai", { length: 50 }),
    clusterId: integer("cluster_id"),
    probabilitateConversie: numeric("probabilitate_conversie", { precision: 5, scale: 4 }),
    probabilitateChurn: numeric("probabilitate_churn", { precision: 5, scale: 4 }),
    predictedLtv: numeric("predicted_ltv", { precision: 15, scale: 2 }),

    // --- SECȚIUNEA 10: POST-VÂNZARE ---
    customerStatus: varchar("customer_status", { length: 30 }).default("PROSPECT"),
    dataPrimaComanda: date("data_prima_comanda"),
    dataUltimaComanda: date("data_ultima_comanda"),
    valoareTotalaComenzi: numeric("valoare_totala_comenzi", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    numarComenzi: integer("numar_comenzi").notNull().default(0),
    averageOrderValue: numeric("average_order_value", { precision: 15, scale: 2 }),

    // --- OWNER & VERSIONING ---
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("idx_gold_companies_cui_tenant").on(t.tenantId, t.cui),
    index("idx_gold_companies_lead_score")
      .on(t.tenantId, t.leadScore, t.currentState)
      .where(sql`${t.doNotContact} = FALSE`),
    index("idx_gold_companies_state").on(t.tenantId, t.currentState, t.stateChangedAt),
    index("idx_gold_companies_judet").on(t.tenantId, t.judetCod),
    index("idx_gold_companies_risk").on(t.tenantId, t.categorieRisc, t.scorRiscIntern),
    index("idx_gold_companies_agri")
      .on(t.tenantId, t.isAgricultural, t.categoriaDimensiune)
      .where(sql`${t.isAgricultural} = TRUE`),
    index("idx_gold_companies_owner")
      .on(t.assignedTo, t.currentState)
      .where(sql`${t.assignedTo} IS NOT NULL`),
    index("idx_gold_companies_dashboard").on(
      t.tenantId,
      t.customerStatus,
      t.currentState,
      t.leadScore,
    ),
    index("idx_gold_companies_assigned").on(t.assignedTo),
    index("idx_gold_companies_embedding").using("hnsw", t.aiEmbedding.op("halfvec_cosine_ops")),
    check(
      "chk_gold_state",
      sql`${t.currentState} IN (${sql.raw(leadStates.map((s) => "'" + s + "'").join(","))})`,
    ),
    check(
      "chk_gold_coords_romania",
      sql`(${t.latitude} IS NULL AND ${t.longitude} IS NULL) OR (${t.latitude} BETWEEN 43.5 AND 48.5 AND ${t.longitude} BETWEEN 20 AND 30)`,
    ),
    check("chk_gold_lead_score", sql`${t.leadScore} IS NULL OR (${t.leadScore} BETWEEN 0 AND 100)`),
  ],
);

export const goldContacts = goldSchema.table(
  "gold_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    role: contactRoleEnum("role").default("CONTACT"),
    prenume: varchar("prenume", { length: 120 }),
    nume: varchar("nume", { length: 120 }),
    numeComplet: varchar("nume_complet", { length: 255 }).generatedAlwaysAs(
      sql`TRIM(COALESCE("prenume", '') || ' ' || COALESCE("nume", ''))`,
    ),
    email: varchar("email", { length: 320 }),
    emailVerified: boolean("email_verified").notNull().default(false),
    telefon: varchar("telefon", { length: 32 }),
    telefonVerified: boolean("telefon_verified").notNull().default(false),
    whatsappNumber: varchar("whatsapp_number", { length: 32 }),
    consentGiven: boolean("consent_given").notNull().default(false),
    preferredChannel: varchar("preferred_channel", { length: 30 }),
    preferredTime: varchar("preferred_time", { length: 30 }),
    totalMessagesSent: integer("total_messages_sent").notNull().default(0),
    totalResponses: integer("total_responses").notNull().default(0),
    responseRate: numeric("response_rate", { precision: 5, scale: 2 }).generatedAlwaysAs(
      sql`CASE WHEN "total_messages_sent" > 0 THEN ("total_responses"::numeric / "total_messages_sent"::numeric) * 100 ELSE 0 END`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_gold_contacts_company").on(t.companyId),
    index("idx_gold_contacts_whatsapp").on(t.whatsappNumber),
  ],
);

export const goldLeadJourney = goldSchema.table(
  "gold_lead_journey",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => goldCompanies.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    fromState: varchar("from_state", { length: 30 }),
    toState: varchar("to_state", { length: 30 }),
    channel: varchar("channel", { length: 30 }),
    subject: varchar("subject", { length: 255 }),
    contentPreview: text("content_preview"),
    metadata: jsonb("metadata").notNull().default({}),
    performedBy: uuid("performed_by").references(() => users.id, { onDelete: "set null" }),
    correlationId: varchar("correlation_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_gold_journey_company").on(t.companyId)],
);

export const dailyStats = goldSchema.table(
  "daily_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    statDate: date("stat_date", { mode: "date" }).notNull(),
    pipelineStage: varchar("pipeline_stage", { length: 10 }).notNull().default("E1"),
    bronzeTotal: integer("bronze_total").notNull().default(0),
    silverTotal: integer("silver_total").notNull().default(0),
    goldTotal: integer("gold_total").notNull().default(0),
    avgQualityScore: numeric("avg_quality_score", { precision: 5, scale: 2 }),
    avgLeadScore: numeric("avg_lead_score", { precision: 5, scale: 2 }),
    hitlPending: integer("hitl_pending").notNull().default(0),
    hitlCompleted: integer("hitl_completed").notNull().default(0),
    enrichmentJobsCompleted: integer("enrichment_jobs_completed").notNull().default(0),
    enrichmentJobsFailed: integer("enrichment_jobs_failed").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("unique_daily_stats").on(t.tenantId, t.statDate, t.pipelineStage)],
);

export const pipelineErrors = goldSchema.table(
  "pipeline_errors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    pipelineStage: varchar("pipeline_stage", { length: 10 }).notNull(),
    workerName: varchar("worker_name", { length: 100 }).notNull(),
    jobId: varchar("job_id", { length: 100 }),
    entityType: varchar("entity_type", { length: 50 }),
    entityId: uuid("entity_id").references(() => bronzeContacts.id, { onDelete: "set null" }),
    errorType: varchar("error_type", { length: 50 }).notNull(),
    errorMessage: text("error_message").notNull(),
    errorStack: text("error_stack"),
    severity: errorSeverityEnum("severity").notNull().default("error"),
    recoveryAction: varchar("recovery_action", { length: 50 }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_pipeline_errors_stage").on(t.pipelineStage, t.severity)],
);
