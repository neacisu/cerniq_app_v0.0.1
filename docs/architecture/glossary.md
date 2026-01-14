# Glossary Complet Cerniq.app

## Toate Terminologiile și Definițiile din Proiect

**Versiune:** 2.0 | **Data:** 11 Ianuarie 2026  
**Status:** NORMATIV - Aliniat cu Master Spec v1.2

---

## Cuprins

1. [Acronime și Abrevieri](#1-acronime-și-abrevieri)
2. [Arhitectură Medallion (Bronze/Silver/Gold)](#2-arhitectură-medallion-bronzesilvergold)
3. [Termeni Pipeline și BullMQ](#3-termeni-pipeline-și-bullmq)
4. [HITL și Sistem Aprobare](#4-hitl-și-sistem-aprobare)
5. [Termeni Comunicare și Outreach](#5-termeni-comunicare-și-outreach)
6. [Compliance și Legal](#6-compliance-și-legal)
7. [Termeni Agricoli Specifici](#7-termeni-agricoli-specifici)
8. [Termeni Financiari și Fiscali](#8-termeni-financiari-și-fiscali)
9. [Infrastructură și DevOps](#9-infrastructură-și-devops)
10. [AI/ML și Analiză](#10-aiml-și-analiză)
11. [Integrări Externe](#11-integrări-externe)
12. [Termeni UI/UX](#12-termeni-uiux)
13. [Deprecated și Aliasuri Legacy](#13-deprecated-și-aliasuri-legacy)

---

## 1. Acronime și Abrevieri

### A

| Acronim  | Definiție Completă                                 | Context                                                         |
| -------- | -------------------------------------------------- | --------------------------------------------------------------- |
| **ABAC** | Attribute-Based Access Control                     | Layer 3 autorizare - constrângeri contextuale (IP, oră, device) |
| **ADR**  | Architecture Decision Record                       | Document care captează decizii arhitecturale majore             |
| **ANAF** | Agenția Națională de Administrare Fiscală          | Autoritate fiscală România, API pentru validare CUI și TVA      |
| **ANIF** | Agenția Națională de Îmbunătățiri Funciare         | Administrează amenajările de irigații                           |
| **AOV**  | Average Order Value                                | Valoare medie comandă per client                                |
| **API**  | Application Programming Interface                  | Interfață programatică                                          |
| **APIA** | Agenția de Plăți și Intervenție pentru Agricultură | Gestionează subvențiile agricole UE                             |
| **APM**  | Application Performance Monitoring                 | Monitorizare performanță aplicație (SigNoz)                     |

### B

| Acronim    | Definiție Completă                      | Context                                       |
| ---------- | --------------------------------------- | --------------------------------------------- |
| **B2B**    | Business-to-Business                    | Model de vânzare între firme                  |
| **BISS**   | Basic Income Support for Sustainability | Schemă subvenție PAC                          |
| **BullMQ** | Bull Message Queue                      | Biblioteca Node.js pentru job queues pe Redis |

### C

| Acronim     | Definiție Completă                                | Context                                                    |
| ----------- | ------------------------------------------------- | ---------------------------------------------------------- |
| **CAEN**    | Clasificarea Activităților din Economia Națională | Cod 4 cifre ce clasifică activitatea economică             |
| **CIUS-RO** | Core Invoice Usage Specification România          | Standard național e-Factura bazat pe UBL 2.1               |
| **CLTV**    | Customer Lifetime Value                           | Valoare pe durata de viață a clientului                    |
| **CNP**     | Cod Numeric Personal                              | Identificator unic persoană fizică România                 |
| **CSV**     | Comma-Separated Values                            | Format fișier date tabulare                                |
| **CUI**     | Cod Unic de Identificare                          | Identificator fiscal unic pentru entități juridice România |

### D

| Acronim | Definiție Completă          | Context                               |
| ------- | --------------------------- | ------------------------------------- |
| **DAJ** | Direcția Agricolă Județeană | Autoritate agricolă la nivel de județ |
| **DLQ** | Dead Letter Queue           | Coadă pentru job-uri eșuate definitiv |

### E

| Acronim   | Definiție Completă   | Context                                      |
| --------- | -------------------- | -------------------------------------------- |
| **E.164** | Standard ITU-T E.164 | Format internațional numere telefon (+40...) |
| **E1-E5** | Etapa 1-5            | Cele 5 etape ale pipeline-ului Cerniq        |
| **EOL**   | End of Life          | Dată expirare suport tehnologie              |

### F

| Acronim | Definiție Completă   | Context                                       |
| ------- | -------------------- | --------------------------------------------- |
| **FK**  | Foreign Key          | Cheie străină în bază de date                 |
| **FSM** | Finite State Machine | Mașină de stări finită pentru engagement lead |

### G

| Acronim  | Definiție Completă                 | Context                                       |
| -------- | ---------------------------------- | --------------------------------------------- |
| **GDPR** | General Data Protection Regulation | Regulament UE protecție date personale        |
| **GGN**  | GLOBALG.A.P. Number                | Număr unic identificare certificare GlobalGAP |
| **GIST** | Generalized Search Tree            | Tip index PostgreSQL pentru date geografice   |

### H

| Acronim  | Definiție Completă                 | Context                                           |
| -------- | ---------------------------------- | ------------------------------------------------- |
| **HITL** | Human-in-the-Loop                  | Sistem aprobare manuală pentru decizii critice    |
| **HLR**  | Home Location Register             | Lookup validare numere telefon mobile             |
| **HNSW** | Hierarchical Navigable Small World | Algoritm index pentru căutare vectorială pgvector |

### I

| Acronim  | Definiție Completă                | Context                                   |
| -------- | --------------------------------- | ----------------------------------------- |
| **IBAN** | International Bank Account Number | Format internațional cont bancar          |
| **ICP**  | Ideal Customer Profile            | Profilul ideal al clientului țintă        |
| **II**   | Întreprindere Individuală         | Formă juridică persoană fizică autorizată |
| **IF**   | Întreprindere Familială           | Formă juridică familie                    |

### J

| Acronim   | Definiție Completă | Context                                  |
| --------- | ------------------ | ---------------------------------------- |
| **JSONB** | JSON Binary        | Format JSON binar PostgreSQL cu indexare |
| **JWT**   | JSON Web Token     | Token autentificare                      |

### K

| Acronim | Definiție Completă        | Context                        |
| ------- | ------------------------- | ------------------------------ |
| **KPI** | Key Performance Indicator | Indicator cheie de performanță |

### L

| Acronim   | Definiție Completă                                    | Context                                         |
| --------- | ----------------------------------------------------- | ----------------------------------------------- |
| **LAPAR** | Liga Asociațiilor Producătorilor Agricoli din România | Federație agricolă                              |
| **LIA**   | Legitimate Interest Assessment                        | Evaluare interes legitim GDPR Art.6(1)(f)       |
| **LLM**   | Large Language Model                                  | Model limbaj mare (Grok, GPT, Claude)           |
| **LSU**   | Livestock Unit                                        | Unitate vite mari pentru calcul efectiv animale |
| **LTS**   | Long-Term Support                                     | Versiune cu suport pe termen lung               |

### M

| Acronim  | Definiție Completă                            | Context                                     |
| -------- | --------------------------------------------- | ------------------------------------------- |
| **MADR** | Ministerul Agriculturii și Dezvoltării Rurale | Minister de resort                          |
| **MCP**  | Model Context Protocol                        | Protocol Anthropic pentru acces AI la tools |
| **ML**   | Machine Learning                              | Învățare automată                           |
| **MX**   | Mail Exchanger                                | Record DNS pentru email                     |

### N

| Acronim           | Definiție Completă         | Context                                |
| ----------------- | -------------------------- | -------------------------------------- |
| **NPS**           | Net Promoter Score         | Scor recomandare client (-100 la +100) |
| **Nr. Reg. Com.** | Număr Registrul Comerțului | Format J40/1234/2020                   |

### O

| Acronim   | Definiție Completă                                | Context                                          |
| --------- | ------------------------------------------------- | ------------------------------------------------ |
| **OAuth** | Open Authorization                                | Standard autentificare delegată                  |
| **ONRC**  | Oficiul Național al Registrului Comerțului        | Registru societăți comerciale                    |
| **OSM**   | OpenStreetMap                                     | Hartă open-source (Nominatim)                    |
| **OUAI**  | Organizație de Utilizatori de Apă pentru Irigații | Entitate juridică agricolă pentru irigații       |
| **OTel**  | OpenTelemetry                                     | Standard observabilitate (traces, metrics, logs) |

### P

| Acronim | Definiție Completă                  | Context                        |
| ------- | ----------------------------------- | ------------------------------ |
| **PAC** | Politica Agricolă Comună            | Politică UE subvenții agricole |
| **PFA** | Persoană Fizică Autorizată          | Formă juridică                 |
| **PII** | Personally Identifiable Information | Date cu caracter personal      |
| **PR**  | Pull Request                        | Cerere de îmbinare cod         |

### R

| Acronim   | Definiție Completă                | Context                                |
| --------- | --------------------------------- | -------------------------------------- |
| **RBAC**  | Role-Based Access Control         | Layer 1 autorizare bazat pe roluri     |
| **ReBAC** | Relationship-Based Access Control | Layer 2 autorizare bazat pe relații    |
| **REST**  | Representational State Transfer   | Stil arhitectural API                  |
| **RLS**   | Row-Level Security                | Securitate la nivel de rând PostgreSQL |
| **RTF**   | Rich Text Format                  | Format document text formatat          |

### S

| Acronim    | Definiție Completă                                                      | Context                               |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------- |
| **SA**     | Societate pe Acțiuni                                                    | Formă juridică                        |
| **SIRUTA** | Sistemul Informatic al Registrului Unităților Teritorial-Administrative | Nomenclator localități România        |
| **SKU**    | Stock Keeping Unit                                                      | Identificator unic produs în inventar |
| **SLA**    | Service Level Agreement                                                 | Timp maxim alocat pentru aprobare     |
| **SMTP**   | Simple Mail Transfer Protocol                                           | Protocol trimitere email              |
| **SPV**    | Spațiul Privat Virtual                                                  | Portal ANAF pentru contribuabili      |
| **SRL**    | Societate cu Răspundere Limitată                                        | Formă juridică                        |
| **SSL**    | Secure Sockets Layer                                                    | Protocol criptare (înlocuit de TLS)   |

### T

| Acronim | Definiție Completă        | Context                       |
| ------- | ------------------------- | ----------------------------- |
| **TLS** | Transport Layer Security  | Protocol criptare comunicații |
| **TOC** | Table of Contents         | Cuprins                       |
| **TVA** | Taxa pe Valoarea Adăugată | Impozit pe consum             |

### U

| Acronim  | Definiție Completă            | Context                                  |
| -------- | ----------------------------- | ---------------------------------------- |
| **UBL**  | Universal Business Language   | Standard OASIS pentru documente business |
| **UI**   | User Interface                | Interfață utilizator                     |
| **UUID** | Universally Unique Identifier | Identificator unic universal (v4 sau v7) |
| **UX**   | User Experience               | Experiență utilizator                    |

### V

| Acronim  | Definiție Completă | Context                         |
| -------- | ------------------ | ------------------------------- |
| **VOIP** | Voice over IP      | Telefonie prin internet         |
| **VP**   | Vice President     | Nivel executive pentru escalare |

### W

| Acronim | Definiție Completă | Context             |
| ------- | ------------------ | ------------------- |
| **WA**  | WhatsApp           | Platformă mesagerie |

### X

| Acronim    | Definiție Completă           | Context                                   |
| ---------- | ---------------------------- | ----------------------------------------- |
| **xAI**    | eXplainable AI / xAI Company | Compania lui Elon Musk (Grok LLM)         |
| **XState** | X State Machine              | Librărie JavaScript pentru state machines |

### Z

| Acronim | Definiție Completă    | Context                                    |
| ------- | --------------------- | ------------------------------------------ |
| **Zod** | Zod Schema Validation | Librărie TypeScript pentru validare scheme |

---

## 2. Arhitectură Medallion (Bronze/Silver/Gold)

### Concepte Fundamentale

| Termen                       | Definiție                                             | Caracteristici                                            |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| **Medallion Architecture**   | Arhitectură date în 3 straturi progresive de calitate | Bronze → Silver → Gold                                    |
| **Bronze Layer**             | Strat date brute, nevalidate                          | Append-only, imuabil, source of truth pentru reprocessare |
| **Silver Layer**             | Strat date curățate și validate                       | Normalizate, deduplicate, entity resolution               |
| **Gold Layer**               | Strat date operaționale, ready-for-outreach           | Complet îmbogățite, 150+ câmpuri per contact              |
| **Golden Record**            | Contact complet îmbogățit în Gold layer               | Ready pentru automatizare vânzări completă                |
| **Data Quality Progression** | Procesul de avansare date între straturi              | Bronze → Silver → Gold cu criterii specifice              |

### Componente Bronze

| Termen                  | Definiție                                  |
| ----------------------- | ------------------------------------------ |
| **bronze_contacts**     | Tabel canonic pentru date brute ingerate   |
| **raw_payload**         | JSONB cu date originale nemodificate       |
| **source_type**         | Enum: import, webhook, scrape, manual, api |
| **source_identifier**   | URL/filename/API endpoint sursă            |
| **content_hash**        | SHA-256 pentru deduplicare exactă          |
| **ingestion_timestamp** | Momentul ingestiei datelor                 |

### Componente Silver

| Termen                   | Definiție                                                 |
| ------------------------ | --------------------------------------------------------- |
| **silver_companies**     | Tabel canonic companii validate                           |
| **silver_contacts**      | Tabel canonic persoane de contact                         |
| **cui_validated**        | Flag validare CUI prin modulo-11 + ANAF                   |
| **denumire_normalizata** | Nume firmă normalizat (UPPER, TRIM)                       |
| **enrichment_status**    | Status îmbogățire: PENDING, IN_PROGRESS, COMPLETE, FAILED |
| **Entity Resolution**    | Proces identificare și unificare entități duplicate       |
| **Fuzzy Matching**       | Potrivire aproximativă pentru deduplicare                 |

### Componente Gold

| Termen                     | Definiție                                           |
| -------------------------- | --------------------------------------------------- |
| **gold_companies**         | Tabel canonic companii operaționale (150+ câmpuri)  |
| **gold_contacts**          | Tabel canonic persoane fizice de contact            |
| **gold_lead_journey**      | Tabel state machine pentru engagement               |
| **gold_affiliations**      | Tabel graf social și relații între entități         |
| **gold_organizations**     | Tabel pentru OUAI, cooperative, grupuri producători |
| **gold_communication_log** | Audit complet al comunicărilor                      |
| **gold_sequence_state**    | Starea secvențelor de follow-up                     |

### Criterii Avansare

| Tranziție           | Criterii Obligatorii                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Bronze → Silver** | 1+ identificator valid (CUI/email/telefon), date < 30 zile                          |
| **Silver → Gold**   | CUI validat ANAF, contact verificat (SMTP/HLR), bilanț < 2 ani, 60%+ completitudine |

---

## 3. Termeni Pipeline și BullMQ

### Concepte BullMQ

| Termen             | Definiție                                   |
| ------------------ | ------------------------------------------- |
| **Queue**          | Coadă de job-uri în Redis                   |
| **Worker**         | Proces care consumă job-uri dintr-o coadă   |
| **Job**            | Unitate de lucru cu payload și metadata     |
| **Flow**           | Secvență de job-uri cu dependențe           |
| **FlowProducer**   | Orchestrator pentru crearea flow-urilor     |
| **Delayed Job**    | Job programat pentru execuție viitoare      |
| **Repeatable Job** | Job care se repetă la intervale regulate    |
| **Stalled Job**    | Job blocat care necesită recuperare         |
| **Backoff**        | Strategie retry: exponential sau fixed      |
| **Limiter**        | Rate limiting per coadă                     |
| **Concurrency**    | Număr job-uri procesate simultan per worker |

### Pattern-uri Cozi

| Pattern               | Format                        | Exemple                                         |
| --------------------- | ----------------------------- | ----------------------------------------------- |
| **Naming Convention** | `{layer}:{category}:{action}` | `bronze:ingest:csv-parser`                      |
| **Bronze Queues**     | `bronze:*`                    | `bronze:ingest:*`, `bronze:dedup:*`             |
| **Silver Queues**     | `silver:*`                    | `silver:validate:*`, `silver:norm:*`            |
| **Enrich Queues**     | `enrich:*`                    | `enrich:anaf:*`, `enrich:termene:*`             |
| **Gold Queues**       | `gold:*`                      | `gold:score:*`, `gold:journey:*`                |
| **Outreach Queues**   | `outreach:*`                  | `outreach:orchestrator:*`                       |
| **WhatsApp Queues**   | `q:wa:phone_{01-20}`          | Câte o coadă per număr telefon                  |
| **Email Queues**      | `q:email:*`                   | `q:email:cold`, `q:email:warm`                  |
| **Pipeline Queues**   | `pipeline:*`                  | `pipeline:orchestrator:*`, `pipeline:monitor:*` |
| **Quota Queues**      | `quota:*`                     | `quota:guardian:check`                          |

### Categorii Workeri E1 (61 workeri)

| Categorie                  | Prefix              | Număr | Scop                                         |
| -------------------------- | ------------------- | ----- | -------------------------------------------- |
| **A - Ingestie**           | `bronze:ingest:*`   | 5     | CSV, JSON, PDF, HTML, Excel parsing          |
| **B - Normalizare**        | `silver:norm:*`     | 4     | Company name, address, phone E.164, email    |
| **C - Validare CUI**       | `silver:validate:*` | 2     | Checksum modulo-11, ANAF API                 |
| **D - ANAF API**           | `enrich:anaf:*`     | 5     | Fiscal status, TVA, e-Factura, address, CAEN |
| **E - Termene.ro**         | `enrich:termene:*`  | 2     | Company base, financials                     |
| **F - ONRC**               | `enrich:onrc:*`     | 1     | Registration data                            |
| **G - Email Enrichment**   | `enrich:email:*`    | 3     | Discovery (Hunter), MX check, SMTP verify    |
| **H - Telefon Enrichment** | `enrich:phone:*`    | 3     | Type detect, HLR lookup, WhatsApp check      |
| **I - Web Scraping**       | `enrich:web:*`      | 1     | Fetch pages                                  |
| **J - AI Structuring**     | `enrich:ai:*`       | 1     | Text extraction with Grok                    |
| **K - Geocoding**          | `enrich:geo:*`      | 1     | Nominatim geocoding                          |
| **L - Agricol**            | `enrich:apia:*`     | 1     | Farmer lookup                                |
| **M - Deduplicare**        | `silver:dedup:*`    | 2     | Hash check, fuzzy match                      |
| **N - Quality Scoring**    | `silver:quality:*`  | 3     | Completeness scoring                         |
| **O - Agregare**           | `silver:merge:*`    | 2     | Company merge                                |
| **P - Pipeline Control**   | `pipeline:*`        | 4     | Orchestrator, monitor, health                |

### Categorii Workeri E2 (52 workeri)

| Categorie                  | Prefix                    | Scop                           |
| -------------------------- | ------------------------- | ------------------------------ |
| **A - Quota Guardian**     | `quota:guardian:*`        | Check, increment, reset quotas |
| **B - Orchestrare**        | `outreach:orchestrator:*` | Dispatch, router               |
| **C - WhatsApp**           | `q:wa:phone_{01-20}`      | 20 cozi + followup per număr   |
| **D - Email Cold**         | `q:email:cold`            | Instantly.ai integration       |
| **E - Email Warm**         | `q:email:warm`            | Resend integration             |
| **F - Template**           |                           | Template rendering, spintax    |
| **G - Webhook Ingest**     |                           | Incoming webhooks processing   |
| **H - Sequence**           |                           | Sequence management            |
| **I - Lead State**         |                           | FSM transitions                |
| **J - Sentiment**          |                           | AI analysis                    |
| **K - Health**             |                           | Monitoring                     |
| **L - Human Intervention** |                           | HITL triggers                  |

### Termeni Job-uri

| Termen               | Definiție                                       |
| -------------------- | ----------------------------------------------- |
| **correlationId**    | ID pentru tracing end-to-end al unui flow       |
| **causationId**      | ID-ul evenimentului care a cauzat job-ul curent |
| **idempotencyKey**   | Cheie pentru a preveni procesare duplicată      |
| **attemptsMade**     | Număr încercări făcute pentru un job            |
| **stalledInterval**  | Interval verificare job-uri blocate             |
| **lockDuration**     | Durată blocare job în procesare                 |
| **removeOnComplete** | Politică ștergere job-uri completate            |
| **removeOnFail**     | Politică ștergere job-uri eșuate                |

---

## 4. HITL și Sistem Aprobare

### Concepte Fundamentale HITL

| Termen                    | Definiție                                                       |
| ------------------------- | --------------------------------------------------------------- |
| **HITL**                  | Human-in-the-Loop - intervenție umană în procese automate       |
| **Polymorphic Approval**  | Model aprobare unificat pentru toate tipurile de entități       |
| **approval_tasks**        | Tabel canonic centralizat pentru toate aprobările               |
| **approval_type_configs** | Configurări per tip aprobare (SLA, escalare, routing)           |
| **Escalation Chain**      | Lanț de escalare: approver → manager → director                 |
| **SLA Tiers**             | Niveluri SLA: Critical (4h), High (8h), Normal (24h), Low (72h) |

### Stări Aprobare

| Stare            | Definiție                         | Tranziții Posibile                            |
| ---------------- | --------------------------------- | --------------------------------------------- |
| **pending**      | Așteptare asignare                | → assigned, auto_assign                       |
| **assigned**     | Asignat unui aprobator            | → in_review, reassign, escalated              |
| **in_review**    | În curs de analiză                | → approved, rejected, escalated, pending_info |
| **pending_info** | Așteptare informații suplimentare | → in_review, escalated                        |
| **escalated**    | Escalatat la nivel superior       | → assigned, approved, rejected, expired       |
| **approved**     | Aprobat (stare finală)            | -                                             |
| **rejected**     | Respins (stare finală)            | -                                             |
| **expired**      | Expirat SLA (stare finală)        | -                                             |

### Tipuri Aprobare per Etapă

| Etapă  | approval_type       | Trigger                              | SLA Default |
| ------ | ------------------- | ------------------------------------ | ----------- |
| **E1** | `data_quality`      | Completeness < 70%                   | 24h         |
| **E2** | `content_review`    | First message to segment             | 8h          |
| **E3** | `pricing_approval`  | Discount > 15% sau valoare > €50K    | 4h          |
| **E4** | `credit_approval`   | Risk score > 0.5 sau valoare > €100K | 48h         |
| **E5** | `campaign_approval` | Toate campaniile                     | 72h         |

### Termeni SLA

| Termen              | Definiție                                 |
| ------------------- | ----------------------------------------- |
| **sla_minutes**     | Minute alocate pentru aprobare            |
| **due_at**          | Timestamp deadline                        |
| **paused_at**       | Timestamp pauză SLA                       |
| **total_paused_ms** | Total milisecunde în pauză                |
| **Business Hours**  | Ore lucru (09:00-18:00) vs Calendar Hours |
| **SLA Warning 80%** | Alertă la 80% din timpul SLA              |
| **SLA Breach**      | Depășire timp SLA                         |

### Audit și Logging

| Termen                 | Definiție                                        |
| ---------------------- | ------------------------------------------------ |
| **approval_audit_log** | Tabel imutabil pentru audit trail                |
| **event_hash**         | Hash SHA-256 pentru tamper detection             |
| **previous_hash**      | Hash lanț pentru verificare integritate          |
| **actor_user_id**      | UUID utilizator care a făcut acțiunea            |
| **actor_on_behalf_of** | UUID delegare (când acționează în numele altuia) |
| **decision_rationale** | Motivația deciziei de aprobare/respingere        |

---

## 5. Termeni Comunicare și Outreach

### Concepte Generale

| Termen            | Definiție                                          |
| ----------------- | -------------------------------------------------- |
| **Cold Outreach** | Prima contactare a unui prospect                   |
| **Warm Outreach** | Comunicare cu leads care au răspuns                |
| **Follow-up**     | Mesaj ulterior primului contact                    |
| **Sequence**      | Secvență automatizată de mesaje                    |
| **Multi-channel** | Comunicare pe multiple canale (WA, Email, Telefon) |

### Stări Engagement (FSM)

| Stare                | Definiție                           | Tranziție Din      |
| -------------------- | ----------------------------------- | ------------------ |
| **COLD**             | Nu a fost contactat încă            | - (stare inițială) |
| **CONTACTED_WA**     | Contactat pe WhatsApp, fără răspuns | COLD               |
| **CONTACTED_EMAIL**  | Contactat pe Email, fără răspuns    | COLD               |
| **WARM_REPLY**       | A răspuns (pozitiv sau neutru)      | CONTACTED\_\*      |
| **NEGOTIATION**      | În negociere activă                 | WARM_REPLY         |
| **PROPOSAL**         | Ofertă trimisă                      | NEGOTIATION        |
| **CLOSING**          | În proces de închidere              | PROPOSAL           |
| **CONVERTED**        | Convertit în client                 | CLOSING            |
| **ONBOARDING**       | În proces de onboarding             | CONVERTED          |
| **NURTURING_ACTIVE** | Nurturing activ post-vânzare        | ONBOARDING         |
| **AT_RISK**          | Client cu risc de churn             | NURTURING_ACTIVE   |
| **LOYAL_ADVOCATE**   | Client loial și promotor            | NURTURING_ACTIVE   |
| **CHURNED**          | Client pierdut                      | AT_RISK            |
| **DEAD**             | Nu mai răspunde / dezinteresat      | CONTACTED\_\*      |
| **PAUSED**           | Pauză temporară (vacanță, etc.)     | Orice stare        |

### Canale Comunicare

| Canal               | Definiție                   | Provider     |
| ------------------- | --------------------------- | ------------ |
| **WHATSAPP**        | Mesagerie WhatsApp Business | TimelinesAI  |
| **EMAIL_INSTANTLY** | Cold email outreach         | Instantly.ai |
| **EMAIL_RESEND**    | Warm/transactional email    | Resend       |
| **PHONE_CALL**      | Apel telefonic              | -            |
| **SMS**             | Mesaj text                  | -            |

### Tipuri Mesaje

| Tip                     | Definiție                    |
| ----------------------- | ---------------------------- |
| **INITIAL_OUTREACH**    | Prima contactare             |
| **FOLLOW_UP_1/2/3**     | Mesaje follow-up succesive   |
| **REPLY_TO_LEAD**       | Răspuns la mesajul lead-ului |
| **PROFORMA_SENT**       | Proformă trimisă             |
| **DOCUMENT_SENT**       | Document atașat trimis       |
| **SYSTEM_NOTIFICATION** | Notificare sistem            |

### Status Comunicare

| Status        | Definiție                 |
| ------------- | ------------------------- |
| **PENDING**   | În așteptare procesare    |
| **QUEUED**    | În coadă pentru trimitere |
| **SENT**      | Trimis                    |
| **DELIVERED** | Livrat                    |
| **READ**      | Citit                     |
| **REPLIED**   | Răspuns primit            |
| **BOUNCED**   | Respins (email)           |
| **FAILED**    | Eșuat                     |
| **CANCELLED** | Anulat                    |

### WhatsApp Specific

| Termen                    | Definiție                                             |
| ------------------------- | ----------------------------------------------------- |
| **WhatsApp Cluster**      | Grup de 20 numere WhatsApp                            |
| **assigned_phone_number** | Număr WA alocat permanent unui lead (sticky session)  |
| **Quota Guardian**        | Sistem rate limiting pentru 200 contacte NOI/zi/număr |
| **quota_cost**            | Cost: 1 pentru NEW, 0 pentru FOLLOW-UP                |
| **wa_recipient_phone**    | Număr destinatar format E.164                         |
| **Jitter**                | Delay random 30s + Random(0, 120s) între mesaje       |
| **Business Hours**        | 09:00-18:00 local timezone                            |

### Email Specific

| Termen             | Definiție                                              |
| ------------------ | ------------------------------------------------------ | ---- | ------ |
| **Inbox Rotation** | Rotație între multiple inbox-uri pentru deliverability |
| **Warm-up**        | Încălzire inbox nou (20→50→100→200→500 emails/zi)      |
| **Bounce Rate**    | Rată respingere email (< 3% threshold)                 |
| **Spam Rate**      | Rată marcare spam (< 0.1% threshold)                   |
| **Delivery Rate**  | Rată livrare (> 95% target)                            |
| **Spintax**        | Sintaxă pentru variații text: {Salut                   | Bună | Hello} |

---

## 6. Compliance și Legal

### GDPR

| Termen             | Definiție                                                    |
| ------------------ | ------------------------------------------------------------ |
| **GDPR**           | Regulament General Protecție Date (EU 2016/679)              |
| **Legea 190/2018** | Implementare GDPR în România                                 |
| **Art. 6(1)(f)**   | Temei legal - interes legitim                                |
| **Art. 6(1)(a)**   | Temei legal - consimțământ                                   |
| **Art. 6(1)(b)**   | Temei legal - execuție contract                              |
| **Art. 6(1)(c)**   | Temei legal - obligație legală                               |
| **LIA**            | Legitimate Interest Assessment - documentare interes legitim |
| **DPO**            | Data Protection Officer                                      |
| **Data Subject**   | Persoana vizată (lead/contact)                               |

### Drepturi GDPR

| Drept                      | Definiție                                      |
| -------------------------- | ---------------------------------------------- |
| **Right of Access**        | Drept acces la date (Art. 15)                  |
| **Right to Rectification** | Drept rectificare (Art. 16)                    |
| **Right to Erasure**       | Drept ștergere/"drept de a fi uitat" (Art. 17) |
| **Right to Object**        | Drept opoziție la prelucrare (Art. 21)         |
| **Right to Portability**   | Drept portabilitate date (Art. 20)             |

### Câmpuri GDPR în Schema

| Câmp                           | Definiție                                                               |
| ------------------------------ | ----------------------------------------------------------------------- |
| **gdpr_legal_basis**           | Temeiul legal: CONSENT, CONTRACT, LEGITIMATE_INTEREST, LEGAL_OBLIGATION |
| **gdpr_lia_documentat**        | Flag documentare LIA                                                    |
| **consent_email_marketing**    | Consimțământ email marketing                                            |
| **consent_whatsapp**           | Consimțământ WhatsApp                                                   |
| **do_not_contact**             | Flag "nu contacta"                                                      |
| **gdpr_access_request_date**   | Data cerere acces                                                       |
| **gdpr_erasure_request_date**  | Data cerere ștergere                                                    |
| **data_retention_review_date** | Data review retenție                                                    |

### Compliance Fiscal

| Termen               | Definiție                                        |
| -------------------- | ------------------------------------------------ |
| **e-Factura**        | Sistem electronic facturare obligatoriu ANAF     |
| **RO e-Factura**     | Portal național facturi electronice              |
| **CIUS-RO**          | Core Invoice Usage Specification România         |
| **UBL 2.1**          | Universal Business Language - format XML facturi |
| **SPV**              | Spațiu Privat Virtual ANAF                       |
| **status_e_factura** | Flag înregistrare în sistem e-Factura            |

---

## 7. Termeni Agricoli Specifici

### Tipuri Entități Agricole

| Tip                  | Definiție                            |
| -------------------- | ------------------------------------ |
| **FIRMA**            | Societate comercială agricolă        |
| **FERMA_PF**         | Fermă persoană fizică                |
| **COOPERATIVA**      | Cooperativă agricolă                 |
| **OUAI**             | Organizație Utilizatori Apă Irigații |
| **GRUP_PRODUCATORI** | Grup de producători                  |
| **ASOCIATIE**        | Asociație profesională agricolă      |

### Clasificări Agricole

| Termen                   | Definiție                                        |
| ------------------------ | ------------------------------------------------ |
| **tip_exploatatie**      | VEGETALA, ANIMALA, MIXTA                         |
| **categorie_dimensiune** | MICRO, MICA, MEDIE, MARE                         |
| **specialist_cultura**   | Specializare: CEREALE, LEGUME, VITA_DE_VIE, etc. |
| **zona_agricola**        | CAMPIE, DEAL, MUNTE                              |

### Culturi și Suprafețe

| Termen                    | Definiție                                 |
| ------------------------- | ----------------------------------------- |
| **suprafata_totala_ha**   | Suprafață totală în hectare               |
| **suprafata_arendata_ha** | Suprafață luată în arendă                 |
| **suprafata_proprie_ha**  | Suprafață în proprietate                  |
| **suprafata_irigata_ha**  | Suprafață cu sistem irigație              |
| **culturi_principale**    | Array JSON cu culturile majore            |
| **efectiv_animale**       | JSON cu număr animale per tip             |
| **total_lsu**             | Total Livestock Units (unități vite mari) |

### Tipuri Culturi

| Cod                  | Cultură          |
| -------------------- | ---------------- |
| **PORUMB**           | Porumb           |
| **GRAU**             | Grâu             |
| **FLOAREA_SOARELUI** | Floarea soarelui |
| **RAPITA**           | Rapiță           |
| **SOI**              | Soia             |
| **ORZOAICA**         | Orzoaică         |
| **SECARA**           | Secară           |
| **LEGUME**           | Legume           |
| **FRUCTE**           | Fructe           |
| **VIE**              | Viță de vie      |

### Echipamente și Infrastructură

| Termen                          | Definiție                                       |
| ------------------------------- | ----------------------------------------------- |
| **echipamente_agricole**        | Array JSON echipamente (tractor, combină, etc.) |
| **capacitate_stocare_tone**     | Capacitate silozuri în tone                     |
| **sistem_irigare**              | DRIP, SPRINKLER, FLOOD, PIVOT, NONE             |
| **bazin_hidrografic**           | Bazin hidrografic în care se află               |
| **amenajare_hidroameliorativa** | Infrastructură irigații                         |

### Subvenții și Certificări

| Termen                        | Definiție                               |
| ----------------------------- | --------------------------------------- |
| **subventii_apia_ultimul_an** | Valoare subvenții APIA                  |
| **BISS**                      | Basic Income Support for Sustainability |
| **ECOSHEME**                  | Scheme eco pentru agricultura durabilă  |
| **TANARI_FERMIERI**           | Schemă subvenții tineri fermieri        |
| **certificat_eco**            | Certificare agricultură ecologică       |
| **certificat_globalgap**      | Certificare GlobalGAP                   |
| **ggn_globalgap**             | Număr GGN (GLOBALG.A.P. Number)         |

### Asociații Profesionale

| Acronim      | Definiție                                             |
| ------------ | ----------------------------------------------------- |
| **LAPAR**    | Liga Asociațiilor Producătorilor Agricoli din România |
| **APPR**     | Asociația Producătorilor de Porumb din România        |
| **PRO_AGRO** | Federația Pro Agro                                    |

---

## 8. Termeni Financiari și Fiscali

### Identificatori Fiscali

| Termen            | Definiție                                  |
| ----------------- | ------------------------------------------ |
| **CUI**           | Cod Unic de Identificare (2-10 cifre)      |
| **CUI_RO**        | CUI cu prefix RO pentru plătitori TVA      |
| **Nr. Reg. Com.** | Număr Registrul Comerțului (J40/1234/2020) |
| **IBAN**          | Cont bancar format internațional           |

### Status Fiscal

| Termen              | Definiție                                            |
| ------------------- | ---------------------------------------------------- |
| **status_firma**    | ACTIVE, INACTIVE, SUSPENDED, RADIATED, IN_INSOLVENTA |
| **platitor_tva**    | Flag plătitor TVA                                    |
| **tva_la_incasare** | Sistem TVA la încasare                               |
| **split_tva**       | Plată defalcată TVA                                  |
| **datorii_anaf**    | Datorii la ANAF                                      |

### Date Bilanț

| Termen                   | Definiție               |
| ------------------------ | ----------------------- |
| **cifra_afaceri**        | Cifra de afaceri anuală |
| **profit_net**           | Profit net              |
| **pierdere_neta**        | Pierdere netă           |
| **active_totale**        | Total active            |
| **active_circulante**    | Active circulante       |
| **datorii_totale**       | Total datorii           |
| **datorii_termen_scurt** | Datorii < 1 an          |
| **datorii_termen_lung**  | Datorii > 1 an          |
| **capitaluri_proprii**   | Capitaluri proprii      |
| **numar_angajati**       | Număr angajați          |
| **an_bilant**            | Anul bilanțului         |

### Indicatori Financiari

| Termen                         | Definiție                             | Formula                                  |
| ------------------------------ | ------------------------------------- | ---------------------------------------- |
| **lichiditate_curenta**        | Capacitate plată datorii termen scurt | Active circulante / Datorii termen scurt |
| **grad_indatorare**            | Nivel îndatorare                      | Datorii totale / Capitaluri proprii      |
| **solvabilitate_patrimoniala** | Solvabilitate                         | Capitaluri proprii / Total pasiv         |

### Credit Scoring

| Termen                      | Definiție                            |
| --------------------------- | ------------------------------------ |
| **scor_risc_intern**        | Scor risc calculat intern (0-100)    |
| **scor_risc_termene**       | Scor risc din Termene.ro (0-100)     |
| **categorie_risc**          | HIGH, MEDIUM, LOW                    |
| **limita_credit_calculata** | Limită credit calculată automat      |
| **limita_credit_aprobata**  | Limită credit aprobată manual        |
| **conditii_plata**          | AVANS, RAMBURS, TERMEN_30, TERMEN_60 |

---

## 9. Infrastructură și DevOps

### Stack Tehnologic (Ianuarie 2026)

| Componentă       | Versiune Canonică       | Rol                          |
| ---------------- | ----------------------- | ---------------------------- |
| **Node.js**      | v24.12.0 LTS            | Runtime principal            |
| **Python**       | 3.14.2 (Free-Threading) | AI/ML, scraping              |
| **PostgreSQL**   | 18.1                    | Bază de date principală      |
| **Redis**        | 7.4.7                   | Cache, queues, rate limiting |
| **Fastify**      | v5.6.2                  | Framework API                |
| **React**        | 19.2.3                  | Frontend UI                  |
| **Tailwind CSS** | v4.1+                   | Styling                      |
| **Refine**       | v5.0+                   | Admin dashboard framework    |
| **BullMQ**       | v5.66.5                 | Job queues                   |
| **Drizzle ORM**  | Latest                  | ORM TypeScript               |

### Docker Infrastructure

| Componentă        | Versiune   | Rol                            |
| ----------------- | ---------- | ------------------------------ |
| **Docker Engine** | 28.x/29.x  | Container runtime              |
| **Traefik**       | v3.6.6     | Reverse proxy, SSL termination |
| **SigNoz**        | v0.106.0   | APM, traces, logs, metrics     |
| **ClickHouse**    | Via SigNoz | Storage observability          |

### PostgreSQL Extensions

| Extensie     | Versiune | Rol                                        |
| ------------ | -------- | ------------------------------------------ |
| **pgvector** | 0.8.0+   | Vector embeddings pentru căutare semantică |
| **PostGIS**  | 3.5+     | Date geografice și queries spațiale        |
| **pg_cron**  | -        | Scheduled jobs în PostgreSQL               |

### Redis Configuration

| Parametru            | Valoare    | Scop                 |
| -------------------- | ---------- | -------------------- |
| **maxmemory**        | 100GB      | Memorie alocată      |
| **maxmemory-policy** | noeviction | CRITIC pentru BullMQ |
| **appendonly**       | yes        | Persistență          |

### Observability (OpenTelemetry)

| Termen      | Definiție                                        |
| ----------- | ------------------------------------------------ |
| **Trace**   | Parcurs complet al unei cereri prin sistem       |
| **Span**    | Unitate de lucru în cadrul unui trace            |
| **Metric**  | Măsurătoare numerică (counter, gauge, histogram) |
| **Log**     | Înregistrare text structurată                    |
| **Baggage** | Context propagat între servicii                  |

### Metrici Obligatorii

| Metric                   | Tip       | Threshold Alert |
| ------------------------ | --------- | --------------- |
| **jobs_processed_total** | Counter   | -               |
| **job_duration_seconds** | Histogram | P95 > 30s       |
| **job_errors_total**     | Counter   | >5% error rate  |
| **queue_depth**          | Gauge     | >1000 pending   |
| **api_latency_seconds**  | Histogram | P95 > 500ms     |
| **llm_tokens_used**      | Counter   | Cost cap breach |

---

## 10. AI/ML și Analiză

### LLM Routing

| Provider             | Model                  | Use Case                          | Rate Limit   |
| -------------------- | ---------------------- | --------------------------------- | ------------ |
| **xAI Grok**         | grok-2                 | Text structuring, ofertă generare | 60 req/min   |
| **OpenAI**           | text-embedding-3-large | Embeddings 1536D                  | 3000 req/min |
| **Anthropic Claude** | Claude 3.5 Sonnet      | Analiză complexă                  | Per contract |

### Termeni AI

| Termen                | Definiție                                       |
| --------------------- | ----------------------------------------------- |
| **Embedding**         | Vector reprezentare semantică (1536 dimensiuni) |
| **Vector Search**     | Căutare bazată pe similaritate cosinus          |
| **Semantic Search**   | Căutare pe înțeles, nu keywords                 |
| **Neuro-Symbolic AI** | Combinație rețele neuronale + reguli simbolice  |
| **Guardrails**        | Verificări anti-halucinare pentru AI            |
| **RAG**               | Retrieval Augmented Generation                  |

### Guardrail Checks (E3)

| Guard                | Definiție                         |
| -------------------- | --------------------------------- |
| **price_guard**      | preț_oferit >= preț_minim_aprobat |
| **stock_guard**      | stock_quantity > 0                |
| **discount_guard**   | discount <= max_discount_aprobat  |
| **product_exists**   | SKU există în catalog             |
| **client_validated** | CUI valid + date fiscale OK       |

### ML Features

| Termen                      | Definiție                         |
| --------------------------- | --------------------------------- |
| **lead_score**              | Scor lead 0-100                   |
| **fit_score**               | Potrivire cu ICP                  |
| **engagement_score**        | Nivel activitate                  |
| **intent_score**            | Semnal de cumpărare               |
| **probabilitate_conversie** | Probabilitate conversie (0.0-1.0) |
| **probabilitate_churn**     | Probabilitate pierdere client     |
| **predicted_cltv**          | Customer Lifetime Value prezis    |
| **segment_ai**              | Segment generat automat de ML     |
| **cluster_id**              | ID cluster din clustering         |

---

## 11. Integrări Externe

### API-uri Românești

| Integrare      | Provider   | Tip          | Rate Limit | Cost    |
| -------------- | ---------- | ------------ | ---------- | ------- |
| **ANAF API**   | ANAF       | OAuth + Cert | 1 req/sec  | Gratuit |
| **Termene.ro** | Termene.ro | API Key      | 20 req/sec | Plătit  |
| **ONRC/Recom** | ONRC       | -            | 5 req/sec  | -       |
| **Oblio.eu**   | Oblio      | API Key      | N/A        | Plătit  |

### API-uri Email

| Integrare        | Provider   | Tip          | Rate Limit  | Cost         |
| ---------------- | ---------- | ------------ | ----------- | ------------ |
| **Hunter.io**    | Hunter     | API Key      | 15 req/sec  | $0.01/email  |
| **ZeroBounce**   | ZeroBounce | API Key      | 10 req/sec  | $0.008/email |
| **Instantly.ai** | Instantly  | Bearer Token | 100 req/10s | $37+/lună    |
| **Resend**       | Resend     | API Key      | 100 req/sec | $0.40/1K     |

### API-uri Messaging

| Integrare       | Provider    | Rate Limit | Cost        |
| --------------- | ----------- | ---------- | ----------- |
| **TimelinesAI** | TimelinesAI | 50 req/min | $25-60/seat |

### API-uri Altele

| Integrare     | Provider | Rate Limit | Cost           |
| ------------- | -------- | ---------- | -------------- |
| **Nominatim** | OSM      | 50 req/sec | Gratuit        |
| **Revolut**   | Revolut  | N/A        | Per tranzacție |
| **Sameday**   | Sameday  | N/A        | Per livrare    |

---

## 12. Termeni UI/UX

### Componente Dashboard

| Termen                | Definiție                     |
| --------------------- | ----------------------------- |
| **Approval Inbox**    | Lista aprobări în așteptare   |
| **Lead Pipeline**     | Vizualizare Kanban stări lead |
| **Activity Timeline** | Istoric interacțiuni          |
| **KPI Cards**         | Carduri metrici cheie         |
| **Filter Sidebar**    | Bară filtre laterală          |
| **Bulk Actions**      | Acțiuni în masă               |

### Refine Framework

| Termen              | Definiție                                   |
| ------------------- | ------------------------------------------- |
| **DataProvider**    | Adaptor pentru surse de date                |
| **Resource**        | Entitate CRUD (leads, companies, approvals) |
| **InferenceHelper** | Inferență automată tipuri                   |
| **AccessControl**   | Sistem permisiuni UI                        |

### Roluri Utilizator

| Rol               | Level | Permisiuni                                |
| ----------------- | ----- | ----------------------------------------- |
| **super_admin**   | 0     | Acces complet, toate tenants              |
| **tenant_admin**  | 1     | Admin pe tenant                           |
| **sales_manager** | 2     | leads:\*, approvals:approve, reports:read |
| **sales_rep**     | 3     | leads:read,create,update, contacts:\*     |
| **viewer**        | 4     | Read-only                                 |
| **approver**      | 3     | approvals:view,approve,reject             |

### Buying Roles (Contact)

| Rol                | Definiție            |
| ------------------ | -------------------- |
| **DECISION_MAKER** | Ia decizia finală    |
| **INFLUENCER**     | Influențează decizia |
| **CHAMPION**       | Susținător intern    |
| **GATEKEEPER**     | Controlează accesul  |
| **USER**           | Utilizator final     |

---

## 13. Deprecated și Aliasuri Legacy

### Termeni Deprecated

| Element Deprecated      | Înlocuit Cu              | Motiv                          |
| ----------------------- | ------------------------ | ------------------------------ |
| **gold_hitl_tasks**     | `approval_tasks`         | Tabele per-stage → centralizat |
| **shop_id**             | `tenant_id`              | Naming inconsistent            |
| **assigned_to** (email) | `assigned_to` (UUID)     | Identity contract              |
| **cui UNIQUE** (global) | `UNIQUE(tenant_id, cui)` | Multi-tenant break             |
| **current_stage**       | `current_state`          | FSM naming                     |
| **assigned_phone_id**   | `assigned_phone_number`  | Claritate                      |

### Aliasuri Legacy (pentru compatibilitate)

```typescript
const LEGACY_ALIASES = {
  shop_id: "tenant_id",
  current_stage: "current_state",
  assigned_phone_id: "assigned_phone_number",
} as const;
```

### Documente Deprecated

| Document                                                     | Status        | Înlocuit Cu         |
| ------------------------------------------------------------ | ------------- | ------------------- |
| `/mnt/project/__Schema_contacte_bronze_silver_gold.md`       | ⛔ DEPRECATED | Versiunea CORRECTED |
| `/mnt/project/Cerniq_Master_Spec_Normativ_Complet.md` (v1.0) | ⛔ OUTDATED   | Master Spec v1.2    |

---

## Referințe

- **Master Spec v1.2:** `__Cerniq_Master_Spec_Normativ_Complet.md`
- **HITL System:** `Unified_HITL_Approval_System_for_B2B_Sales_Automation.md`
- **Schema Database:** `__Schema_contacte_bronze_silver_gold.md`
- **Workers E1:** `__Etapa_1_-_Documentare_workers_cerniq-workers.md`
- **Workers E2:** `__Etapa_2_-_Complete-workers-cold-outreach.md`
- **Frontend Stack:** `__Etapa_1_-_Frontend_strategy___tech_stack.md`

---

_Document generat din analiza exhaustivă a 25+ documente proiect._  
_Ultima actualizare: 11 Ianuarie 2026_
