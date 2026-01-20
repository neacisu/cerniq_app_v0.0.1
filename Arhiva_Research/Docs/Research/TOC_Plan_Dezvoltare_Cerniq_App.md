**TOC - TABLE OF CONTENTS**

*Audit Complet Documentațe Proiect Cerniq App*

Plan de Dezvoltare ș Implementare - Metodologie Vertical-Slice

Data Audit: Ianuarie 2026 \| Versiune: 1.0

**1. INTRODUCERE**

**1.1 Scopul Documentului**

Prezentul TOC oferă o hartă completă a tuturor componentelor sistemului
Cerniq App - o platformă de automatizare a vânzăilor B2B construită pe
arhitectura Neuro-Simbolică ș metodologia Vertical-Slice.

**1.2 Viziunea Sistemului**

- Arhitect Augmentat de AI (1-Person-Team)

- Paradigma Vertical-Slice pentru dezvoltare incrementală

- Sistem Neuro-Simbolic: Flexibilitate AI + Rigoare Factuală

- Pipeline Medallion: Bronze →Silver →Gold

**1.3 Documente Auditate**

  -------- --------------------------------------------------- -------------------------------------------------------------
  **\#**   **Denumire Document**                               **Scop Principal**

  1        Roadmap_Paralel_Vanzari_AI\_-\_Cerniq_app.rtf       Arhitectură Tehnică ș Strategie Implementare Vertical Slice

  2        Tehnologii_Active_Ianuarie_2026.rtf                 Status Versiuni Active LTS/Stable pentru Stack-ul Modern

  3        Etapa_1\_-\_Strategie_Data_Enrichment.rtf           Pipeline Data Filtering & Enrichment Bronze→Silver

  4        Etapa_2\_-\_Cold_Outreach_Multi-Canal.rtf           Subsistem Distribuit Cold Outreach (WhatsApp + Email)

  5        Date_pentru_Etapa_3\_-\_AI_Vanzari.rtf              Integrare Cunoșinț Produs, Arhitectură Neuro-Simbolică

  6        Etapa_3\_-\_Strategie_Generala_Ofertare.rtf         Sistem Neuro-Simbolic de Ofertare ș Vânzare Autonomă

  7        Etapa_3\_-\_Strategie_ș_Plan.rtf                    Plan Concret Implementare Etapa 3 (9 Sătăâni)

  8        Etapa_4\_-\_Monitorizare_Vanzare_Post-Vanzare.rtf   Ecosistem Flux Cash, Credit, Logistică

  9        Etapa_5\_-\_Nurturing_Leads_Post-Vanzare.rtf        Nurturing Agentic, Analiză Geospațală (PostGIS)

  10       Extindere_Etapa_5_Grupuri_Asocieri.rtf              Integrare OUAI, Cooperative, Grupuri Producăori

  -------- --------------------------------------------------- -------------------------------------------------------------

**2. DOCUMENTAȚE TEHNICĂ**

**2.1 Structura Fișere (Monorepo pnpm Workspaces)**

**2.1.1 Root Directory**

/root

- /apps/api - Backend Fastify v5.6.2

- /apps/web - Frontend React 19 + Refine v5

- /packages/db - Drizzle ORM + Migrați

- /packages/shared-types - Tipuri Zod Exportate

- /workers - Python 3.14.1 Workers

**2.1.2 Structura Features (Vertical Slice)**

/apps/api/src/features/\<feature-name\>/

- index.ts - Plugin Fastify (entry point)

- routes.ts - Endpoint-uri API

- schema.ts - Scheme Zod (validare + tipuri)

- service.ts - Logică Business

**2.2 Structura Baza de Date (PostgreSQL 18.1)**

**2.2.1 Arhitectura Medallion**

  ----------- ------------------------- ---------------------------------------------------------
  **Strat**   **Scop**                  **Tabele Principale**

  Bronze      Ingestie Raw, Imuabil     bronze_onboarding, bronze_webhooks, bronze_imports

  Silver      Date Curățte, Validate    silver_companies, silver_contacts, silver_products

  Gold        Date Operațonale Active   gold_lead_journey, gold_affiliations, gold_transactions

  ----------- ------------------------- ---------------------------------------------------------

**2.2.2 Extensii PostgreSQL Critice**

- **pgvector** - Cătare vectorială embeddings (1536 dim)

- **PostGIS** - Interogăi geospațale, KNN proximity

- **pg\_trgm** - Cătare fuzzy text (BM25)

**2.3 Documentare Detaliată pe Etape**

  ----------- --------------------------- ----------------------------------------------------------------------
  **Etapa**   **Denumire**                **Componente Cheie**

  E1          Data Enrichment             Bronze→Silver, Termene.ro API, ANAF, HLR Validation, Grok AI

  E2          Cold Outreach               20x WhatsApp (TimelinesAI), Instantly.ai, Resend, Quota Guardian

  E3          Ofertare & Vânzare AI       MCP Protocol, Hybrid Search (RRF), Oblio.eu, e-Factura, Guardrails

  E4          Monitorizare Post-Vânzare   Revolut API, Oblio, Termene.ro Scoring, Sameday Logistică

  E5          Nurturing Agentic           PostGIS KNN, NetworkX Graf Social, OUAI/Cooperative, GDPR Compliance

  ----------- --------------------------- ----------------------------------------------------------------------

**2.4 Contracte Stack Tehnologic**

  -------------------- ----------------- -------------------------------------------------------------
  **Componentă**       **Versiune**      **Contract / Specificați**

  Runtime API          Node.js v24.13    LTS Krypton, \--watch nativ, V8 Maglev JIT

  Framework API        Fastify v5.6.2    Type Provider Zod obligatoriu, Hook-based (no middleware)

  AI/Worker Runtime    Python 3.14.1     Free-Threaded (No-GIL), True Parallelism, Memorie Partajată

  Frontend Framework   React 19.2.3      Actions, useOptimistic, React Compiler

  Admin Framework      Refine v5         Headless, Custom Data Provider pentru Fastify

  Database             PostgreSQL 18.1   JSON_TABLE SQL:2023, pgvector, PostGIS, RETURNING OLD

  ORM                  Drizzle ORM       SQL-like, Performanță, drizzle-zod integration

  Styling              Tailwind v4.1+    Oxide Engine (Rust), CSS-first config (@theme)

  Queue Manager        BullMQ v5         Redis 7 backed, Partition per Phone/Channel

  Observabilitate      SigNoz            All-in-one APM, Logs, Traces (OpenTelemetry)

  -------------------- ----------------- -------------------------------------------------------------

**2.5 Contracte Endpoints API**

**2.5.1 Endpoints Interne (Fastify v5)**

  ------------ --------------------- ---------------------------------------------------------------------
  **Metodă**   **Endpoint**          **Descriere / Schema Zod**

  POST         /auth/login           LoginSchema { email, password } →JWT HttpOnly Cookie

  POST         /auth/refresh         Refresh Token Rotation →New Access Token

  POST         /leads                CreateLeadSchema { email, name, companySize } →Bronze

  GET          /leads                ListLeadsSchema { filters, sorters, pagination } →Refine Compatible

  POST         /webhooks/timelines   WhatsApp Events Ingestion (Message, Reply, Delivery)

  POST         /webhooks/instantly   Email Events (Open, Reply, Bounce) →Handover Logic

  POST         /webhooks/revolut     TransactionCreated →Reconciliere Automată Facturi

  POST         /webhooks/shopify     Product/Inventory Update →CDC →Vector Refresh

  ------------ --------------------- ---------------------------------------------------------------------

**2.5.2 Endpoints Externe (Third-Party)**

- **Termene.ro API:** GET /api/companies/{cui} - Date fiscale,
    solvabilitate, dosare

- **Oblio.eu API:** POST /api/v1/invoice - Generare factură, POST
    /api/v1/einvoice - Trimitere SPV

- **TimelinesAI:** POST /api/send - Trimitere WhatsApp, GET
    /api/messages - Istoric

- **Instantly.ai API v2:** POST /api/leads - Adăgare leads, Webhooks
    pentru tracking

- **Sameday API:** POST /api/awb - Generare AWB, GET /api/status -
    Tracking colet

- **Revolut Business API v2:** Webhooks TransactionCreated, GET
    /accounts - Solduri

**2.6 Contracte Frontend (React 19 + Refine v5)**

**2.6.1 Componente Principale**

- **AuthProvider:** Gestionare JWT via HttpOnly Cookies, nu
    localStorage

- **Custom DataProvider:** Serializare filters\[\] compatibilă Fastify
    v5 + qs parser

- **useTable Hook:** Sincronizare stare tabel cu URL (paginare,
    sortare, filtre)

- **useOptimistic (React 19):** Actualizare UI instantanee
    pre-confirmare server

**2.7 Contracte Backend (Fastify v5 + Node.js 24)**

**2.7.1 Validare ș Securitate**

- **fastify-type-provider-zod:** Schema strictă obligatorie pe fiecare
    rută

- **@fastify/jwt + @fastify/cookie:** Token storage HttpOnly, Secure,
    SameSite=Strict

- **@fastify/helmet:** Security headers (obligatoriu pentru fereastra
    5-7 Ian)

- **bodyLimit: 1MB:** Protecțe DoS payload-uri malițoase

**2.8 Contracte Baze de Date (Drizzle + PostgreSQL 18)**

**2.8.1 Tipuri Enum ș Constrângeri**

- **company\_status:** ENUM (\'ACTIVE\', \'INACTIVE\', \'SUSPENDED\',
    \'RADIATED\')

- **engagement\_stage:** ENUM (\'COLD\', \'CONTACTED_WA\',
    \'CONTACTED_EMAIL\', \'WARM_REPLY\', \'NEGOTIATION\', \'CONVERTED\',
    \'DEAD\')

- **verification\_level:** ENUM (\'NONE\', \'BASIC\', \'FULL_FISCAL\',
    \'VERIFIED_CONTACT\')

**2.8.2 Indexare ș Performanță**

- **GIN Index:** Pentru coloane JSONB (atribute flexibile produse)

- **GiST Index:** Pentru coloane GEOGRAPHY (PostGIS proximity search)

- **HNSW Index:** Pentru coloane VECTOR (pgvector semantic search)

**2.9 Contracte API-uri Interne**

**2.9.1 BullMQ Job Queues**

  -------------------------- ------------------------------ --------------------------------
  **Queue Name**             **Producer**                   **Consumer**

  outreach:wa:phone-{id}     Outreach Orchestrator (Node)   Communication Gateway (Python)

  outreach:email:instantly   Outreach Orchestrator (Node)   Email Worker (Python)

  enrichment:fiscal          Bronze Ingestion (Node)        Enrichment Worker (Python)

  ai:rag:query               Chat Handler (Node)            RAG Pipeline (Python)

  -------------------------- ------------------------------ --------------------------------

**2.10 Contracte Workeri Python 3.14**

**2.10.1 Worker Types**

- **Enrichment Worker:** Termene.ro API, ANAF, HLR/Email Validation

- **Communication Gateway:** TimelinesAI send, Instantly send,
    Free-Threading per phone

- **RAG Worker:** Hybrid Search, Reranking (Cross-Encoder), LLM Call

- **Scraping Worker:** Playwright (nu Crawl4AI - incompatibil 3.14),
    PDF parsing

- **CDC Worker:** LISTEN/NOTIFY PostgreSQL →Vector Index Refresh

**2.11 Contracte LLM Frontier**

  ------------------- ---------------------- ------------------------------------------------------------------
  **LLM Provider**    **Use Case**           **Specificați**

  xAI Grok            Structured Outputs     JSON Schema Enforcement (Pydantic), Extracțe date din text liber

  OpenAI GPT-4o       Embedding Generation   text-embedding-3-large (1536 dim) pentru vectorizare produse

  Groq (Llama 3 8B)   Real-time Chat         Latență \<500ms, cost minim pentru conversați vânzăi

  Ollama Local        Privacy-First          Qwen 2.5 sau Llama local pentru date sensibile (full on-premise)

  ------------------- ---------------------- ------------------------------------------------------------------

**2.12 Alte Contracte ș Specificați**

**2.12.1 MCP Protocol (Model Context Protocol)**

- **Resurse:** product://{sku}, lead://{cui}, invoice://{id}

- **Unelte:** search_products, create_proforma, convert_to_invoice,
    check_stock

- **Prompt Templates:** sales_negotiation, product_recommendation

**2.12.2 Quota Guardian (Redis + Lua)**

- **Limită:** 200 contacte NOI/zi per numă WhatsApp

- **Follow-up:** Nelimitat (nu consumă cotă)

- **Script Lua:** Verificare + Incrementare atomică pentru race
    condition prevention

**2.12.3 Guardrails Anti-Halucinare**

- **Price Guard:** pretul_oferit \>= pretul_minim_aprobat

- **Stock Guard:** stock_quantity \> 0 înainte de ofertare

- **Discount Guard:** discount \<= max_discount_aprobat

**3. STRUCTURA PLAN DE IMPLEMENTARE VERTICAL-SLICE**

**3.1 ETAPA 1: Data Enrichment (Bronze →Silver)**

  --------------- ------------------------------------------------------------------------------------------------------
  **Descriere**   Pipeline de îmbogățre date prospecț România: Termene.ro, ANAF, HLR, Email Validation, AI Structuring

  Validare        CUI valid (modulo 11), Email deliverable, Phone carrier verified, Stare fiscală actuală

  Outcome         silver_companies ș silver_contacts populate cu date verificate ș normalizate

  --------------- ------------------------------------------------------------------------------------------------------

**Tabel Centralizator Sprinturi E1**

  ------------ ------------------ ---------------------------------- -------------------
  **Sprint**   **Focus**          **Livrabil**                       **Dependinț**

  E1.S1        Infrastructură     Docker, PostgreSQL 18, BullMQ      None (Foundation)

  E1.S2        Bronze Ingestion   Fastify endpoints, Zod schemas     E1.S1

  E1.S3        API Integration    Termene.ro, ANAF workers           E1.S2

  E1.S4        Validation Layer   HLR, Email verify, Silver schema   E1.S3

  ------------ ------------------ ---------------------------------- -------------------

**Sprint E1.S1: Infrastructură de Bază**

**PR E1.S1.PR1: Docker Compose Setup**

**Descriere:** Configurare docker-compose.yml cu servicii Node.js,
Python, PostgreSQL, Redis

**Validare:** docker compose up porneșe toate serviciile făă erori

**Outcome:** Mediu de dezvoltare local funcțonal cu hot-reload (watch)

**Tabel Centralizator Taskuri E1.S1.PR1**

  --------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Task ID**     **Task Details (JSON Format)**

  E1.S1.PR1.001   {\"denumire\": \"Creare docker-compose.yml base\", \"context_anterior\": \"Proiect nou, făă infrastructură existentă\", \"descriere\": \"Definire servicii: api (node:22-alpine), worker (python:3.14-slim), db (postgres:18), redis (redis:7). Configurare volume pentru persistență PostgreSQL. Setare network bridge intern.\", \"director\": \"/root\", \"restrictii_antihalucinare\": \[\"NU folosi versiuni diferite de cele specificate\", \"NU adăga servicii nespecificate\"\], \"dependenta_anterioare\": \"None\", \"validare\": \"docker compose config returnează YAML valid\", \"outcome\": \"Fișer docker-compose.yml funcțonal\"}

  E1.S1.PR1.002   {\"denumire\": \"Configurare Docker Compose Watch\", \"context_anterior\": \"docker-compose.yml creat în E1.S1.PR1.001\", \"descriere\": \"Adăgare secțune x-develop cu reguli watch: sync pentru .ts/.py files, rebuild pentru package.json/requirements.txt. Configurare sync+restart pentru worker Python.\", \"director\": \"/root\", \"restrictii_antihalucinare\": \[\"NU folosi volume mounts clasice (-v)\", \"Folosi DOAR docker compose watch\"\], \"dependenta_anterioare\": \"E1.S1.PR1.001\", \"validare\": \"docker compose watch detectează modificăi ș sincronizează\", \"outcome\": \"Hot-reload funcțonal pentru development\"}

  E1.S1.PR1.003   {\"denumire\": \"Setup PostgreSQL 18 cu extensii\", \"context_anterior\": \"Container db definit în docker-compose.yml\", \"descriere\": \"Creare init.sql cu: CREATE EXTENSION IF NOT EXISTS pgvector, postgis, pg_trgm. Configurare shared_preload_libraries. Setare volume pentru persistență /var/lib/postgresql/data.\", \"director\": \"/packages/db\", \"restrictii_antihalucinare\": \[\"Versiunea PostgreSQL TREBUIE să fie 18.x\", \"NU omite nicio extensie listată\"\], \"dependenta_anterioare\": \"E1.S1.PR1.001\", \"validare\": \"SELECT extname FROM pg_extension returnează toate extensiile\", \"outcome\": \"PostgreSQL 18 cu pgvector, PostGIS, pg_trgm activate\"}

  E1.S1.PR1.004   {\"denumire\": \"Setup Redis 7 pentru BullMQ\", \"context_anterior\": \"Container redis definit în docker-compose.yml\", \"descriere\": \"Configurare redis.conf pentru persistență AOF. Expunere port 6379 doar intern (făă expose public). Setare maxmemory-policy allkeys-lru.\", \"director\": \"/root\", \"restrictii_antihalucinare\": \[\"NU expune Redis public\", \"NU dezactiva persistenț\"\], \"dependenta_anterioare\": \"E1.S1.PR1.001\", \"validare\": \"redis-cli PING returnează PONG\", \"outcome\": \"Redis 7 ready pentru job queues\"}

  --------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**3.2 ETAPA 2: Cold Outreach Multi-Canal**

  --------------- -----------------------------------------------------------------------------------------------------
  **Descriere**   Sistem distribuit pentru 20 numere WhatsApp + Email (Instantly cold, Resend warm) cu Quota Guardian

  Validare        Limită 200 contacte noi/zi per numă respectată, Handover la reply funcțonal, Email routing corect

  Outcome         gold_lead_journey populate, Cluster WhatsApp operațonal, Email sequences active

  --------------- -----------------------------------------------------------------------------------------------------

**Tabel Centralizator Sprinturi E2**

  ------------ ------------------------- ---------------------------------- ---------------
  **Sprint**   **Focus**                 **Livrabil**                       **Dependinț**

  E2.S1        Quota Guardian            Redis Lua scripts, Rate limiting   E1.S4

  E2.S2        TimelinesAI Integration   20 phone cluster, Webhooks         E2.S1

  E2.S3        Email Infrastructure      Instantly + Resend setup           E2.S1

  E2.S4        Orchestration             Outreach Orchestrator complete     E2.S2, E2.S3

  ------------ ------------------------- ---------------------------------- ---------------

**3.3 ETAPA 3: Ofertare & Vânzare AI (Neuro-Simbolic)**

  --------------- -------------------------------------------------------------------------------------------------------------
  **Descriere**   Agent AI neuro-simbolic: MCP Protocol, Hybrid Search (Vector + BM25 + RRF), Oblio.eu, e-Factura, Guardrails

  Validare        Zero halucinați preț/stoc, Facturi valide fiscal, e-Factura SPV în 5 zile, Proforma→Invoice flow complet

  Outcome         Agent autonom capabil să negocieze ș să emită documente fiscale făă intervențe umană

  --------------- -------------------------------------------------------------------------------------------------------------

**Tabel Centralizator Sprinturi E3**

  ------------ ------------------- ----------------------------------- ---------------
  **Sprint**   **Focus**           **Livrabil**                        **Dependinț**

  E3.S1        Golden Records      Schema hibridă, Chunking semantic   E2.S4

  E3.S2        Hybrid Search       pgvector + BM25 + RRF function      E3.S1

  E3.S3        MCP Server          Resources, Tools, Prompts           E3.S2

  E3.S4        Oblio Integration   Proforma, Invoice, e-Factura        E3.S3

  E3.S5        Guardrails          Price/Stock/Discount guards         E3.S4

  E3.S6        Agent Activation    Shadow mode, Canary deploy          E3.S5

  ------------ ------------------- ----------------------------------- ---------------

**3.4 ETAPA 4: Monitorizare Vânzare & Post-Vânzare**

  --------------- -------------------------------------------------------------------------------------------------
  **Descriere**   Ecosistem Flux Cash (Revolut), Credit (Scoring Termene.ro), Logistică (Sameday), Audit Trails

  Validare        Reconciliere automată plăț, Limite credit dinamice, AWB generation, Human-in-the-Loop funcțonal

  Outcome         Sistem event-driven pentru post-vânzare: de la încasare la livrare făă intervențe manuală

  --------------- -------------------------------------------------------------------------------------------------

**Tabel Centralizator Sprinturi E4**

  ------------ --------------------- ------------------------------ ---------------
  **Sprint**   **Focus**             **Livrabil**                   **Dependinț**

  E4.S1        Revolut Integration   Webhooks, Reconciliere         E3.S6

  E4.S2        Credit Scoring        Termene.ro scoring, Limits     E4.S1

  E4.S3        Sameday Logistics     AWB generation, Tracking       E4.S2

  E4.S4        HITL Workflows        Approval matrix, Escalations   E4.S3

  ------------ --------------------- ------------------------------ ---------------

**3.5 ETAPA 5: Nurturing Agentic & Ecosisteme Relațonale**

  --------------- ---------------------------------------------------------------------------------------------------------------------
  **Descriere**   Nurturing bazat pe proximitate (PostGIS), Graf social (NetworkX), Integrare OUAI/Cooperative/Grupuri Producăori

  Validare        KNN proximity queries funcțonale, Community detection Leiden, GDPR Art.9 compliant, No competition law violations

  Outcome         Agent capabil să exploateze structuri asociative pentru creșere organică (Neighborhood Referral, Affiliation Logic)

  --------------- ---------------------------------------------------------------------------------------------------------------------

**Tabel Centralizator Sprinturi E5**

  ------------ --------------------- ------------------------------- ---------------
  **Sprint**   **Focus**             **Livrabil**                    **Dependinț**

  E5.S1        PostGIS Setup         GiST indexes, KNN functions     E4.S4

  E5.S2        Proximity Nurturing   Neighborhood referral logic     E5.S1

  E5.S3        Social Graph          NetworkX, Leiden algorithm      E5.S2

  E5.S4        OUAI/Coop Ingestion   PDF scraping, MADR data         E5.S3

  E5.S5        Compliance Layer      GDPR Art.9, Competition law     E5.S4

  E5.S6        Agentic Activation    Full nurturing ecosystem live   E5.S5

  ------------ --------------------- ------------------------------- ---------------

**4. TABEL MASTER CENTRALIZATOR**

**4.1 Sumar Complet Etape →Sprinturi →PRs →Taskuri**

  ---------------------- --------------- ---------------- ------------------ -----------------
  **Etapa**              **Sprinturi**   **PRs/Branch**   **Taskuri Est.**   **Durată Est.**

  E1 - Data Enrichment   4               8-12             40-60              2 sătăâni

  E2 - Cold Outreach     4               10-15            50-75              2 sătăâni

  E3 - Ofertare AI       6               15-20            80-100             3 sătăâni

  E4 - Post-Vânzare      4               10-14            50-70              2 sătăâni

  E5 - Nurturing         6               12-18            60-90              3 sătăâni

  **TOTAL**              **24**          **55-79**        **280-395**        **12 sătăâni**

  ---------------------- --------------- ---------------- ------------------ -----------------

**4.2 Convențe Numerotare Taskuri**

**Format Standard:**Ex.Sx.PRx.xxx

- **Ex** = Etapa (E1, E2, E3, E4, E5)

- **Sx** = Sprint în etapă (S1, S2, S3\...)

- **PRx** = Pull Request / Branch (PR1, PR2\...)

- **xxx** = Task ID numeric (001, 002, 003\...)

**Exemplu:**E1.S1.PR1.003 = Etapa 1, Sprint 1, PR 1, Task 003

**4.3 Structură JSON Task Individual**

{ \"id\": \"E1.S1.PR1.001\", \"denumire_task\": \"Creare
docker-compose.yml base\", \"context_anterior\": \"Descriere stare
sistem înainte de task\", \"descriere_detaliata\": \"Paș exacț de
implementare\...\", \"director_implementare\": \"/root sau
/apps/api/src/features/\...\", \"restrictii_antihalucinare\": \[ \"NU
folosi versiuni diferite\", \"NU adăga servicii nespecificate\" \],
\"dependenta_taskuri_anterioare\": \"E1.S1.PR1.000 sau None\",
\"validare_individuala\": \"Criteriu de acceptanță verificabil\",
\"outcome\": \"Rezultat așeptat după finalizare\"}

**---SFÂRȘT DOCUMENT TOC ---**

*Generat din auditul complet al documentaței proiectului Cerniq App*

Ianuarie 2026 \| Metodologie Vertical-Slice \| Arhitectură
Neuro-Simbolică
