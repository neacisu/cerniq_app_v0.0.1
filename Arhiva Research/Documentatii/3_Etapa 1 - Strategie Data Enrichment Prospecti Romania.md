# Etapa 1 - Strategie Avansată de Data Filtering & Enrichment (Bronze -> Silver) pentru Piața din România

Ediția Ianuarie 2026

## 1. Introducere Executivă și Context Strategic

### 1.1. Peisajul Tehnologic la 5 Ianuarie 2026

Data de 5 ianuarie 2026 marchează un punct de inflexiune critic în arhitectura sistemelor software enterprise dedicate pieței din România. Ieșind din perioada tradițională de "code freeze" a sărbătorilor de iarnă, echipele de inginerie se confruntă cu o oportunitate rară de a alinia ciclurile de upgrade ale infrastructurii cu lansarea unor versiuni revoluționare ale principalelor tehnologii de backend. Prezentul raport detaliază o strategie exhaustivă de implementare a unui pipeline de date de tip "Data Filtering & Enrichment", structurat pe paradigma Medallion (Bronze -> Silver), utilizând exclusiv stiva tehnologică definită ca "Active Technologies": **Node.js v24.13**, **Python 3.14.1**, **PostgreSQL 18.1** și **Fastify v5.6.2**.

Această combinație nu este aleatorie; ea reprezintă convergența a trei vectori majori de performanță: maturizarea compilării JIT "Maglev" în Node.js, eliminarea istorică a Global Interpreter Lock (GIL) în Python 3.14 și capacitățile avansate de stocare hibridă (relațională/document) din PostgreSQL 18. Totuși, această putere vine cu responsabilități operaționale acute. Așa cum subliniază documentația tehnică analizată, fereastra 5-7 ianuarie 2026 prezintă un risc de securitate specific ecosistemului Node.js, impunând măsuri defensive imediate în arhitectura de ingestie.1

Obiectivul acestui document este de a oferi o "hartă" tehnică detaliată pentru transformarea datelor brute (Raw/Bronze) – adesea haotice și nestructurate, specifice surselor din România – în active informaționale de înaltă valoare (Silver), validate fiscal și îmbogățite prin algoritmi de inteligență artificială și integrări externe.

### 1.2. Analiza Componentelor Stivei Tehnologice

Pentru a înțelege deciziile arhitecturale propuse în secțiunile ulterioare, este imperativ să analizăm capacitățile și limitările fiecărei componente la momentul scrierii acestui raport.

#### 1.2.1. Node.js v24.13 "Krypton" (Active LTS)

La data de 05.01.2026, Node.js v24.13 reprezintă standardul de aur pentru operațiuni I/O intensive. Având numele de cod "Krypton", această versiune LTS (Long Term Support) aduce optimizări semnificative în gestionarea stream-urilor și a promisiunilor, esențiale pentru stratul de ingestie al arhitecturii noastre.

- **Context Operațional Critic:** Un aspect vital relevat de cercetare este vulnerabilitatea temporară a acestei versiuni. Maintainerii au anunțat o întârziere a patch-urilor de securitate planificate pentru decembrie 2025, reprogramate pentru miercuri, 7 ianuarie 2026.1 Aceasta înseamnă că orice arhitectură implementată pe 5 ianuarie trebuie să presupună că runtime-ul este vulnerabil și să aplice strategii de "shielding" la nivel de aplicație (Fastify) și infrastructură.

- **Rol în Arhitectură:** Node.js va funcționa exclusiv ca "Gateway de Ingestie" (Bronze Layer). Rolul său este să primească datele cu latență minimă, să efectueze o validare superficială ("envelope validation") și să le persiste rapid, delegând procesarea complexă către Python.

#### 1.2.2. Python 3.14.1 (Stable, Free-Threaded)

Aceasta este componenta care redefiniseste economia procesării de date în 2026. Versiunea 3.14.1 este prima versiune stabilă care suportă oficial modul "free-threaded" (fără GIL) ca cetățean de prim rang, conform PEP 703 și PEP 779.1

- **Impact Arhitectural:** Istoric, îmbogățirea datelor (care implică parsing XML complex de la ANAF sau calcule de similaritate fuzzy) necesita multiprocesare (multiprocessing) pentru a utiliza toate nucleele CPU, ceea ce ducea la un consum imens de memorie RAM. Cu Python 3.14.1, putem rula sute de fire de execuție reale în paralel într-un singur proces, partajând memoria pentru resurse statice (cum ar fi nomenclatoarele SIRUTA sau listele de coduri CAEN).

- **Rol în Arhitectură:** "Motorul de Rafinare" (Worker Layer). Python preia datele din Bronze, execută logica de business intensivă CPU/Network și scrie rezultatul curat în Silver.

#### 1.2.3. PostgreSQL 18.1

Versiunea 18.1, lansată în toamna anului 2025, aduce îmbunătățiri substanțiale pentru modelarea hibridă a datelor.

- **Facilități Cheie:** Suportul extins pentru JSON_TABLE (parte a standardului SQL:2023 implementat complet în PG18) permite interogarea datelor nestructurate din stratul Bronze ca și cum ar fi tabele relaționale, fără a necesita duplicarea datelor. De asemenea, clauza RETURNING OLD în instrucțiunile de UPDATE facilitează crearea unor log-uri de audit imuabile, esențiale pentru conformitatea fiscală.3

- **Rol în Arhitectură:** "Depozitul Unic de Adevăr".

#### 1.2.4. Fastify v5.6.2

Alegerea Fastify v5 nu este doar o preferință, ci o necesitate de performanță. Versiunea 5 a eliminat complet suportul pentru middleware-urile stil Express, forțând o arhitectură bazată pe Hook-uri și Plugin-uri, care este mult mai ușor de optimizat de motorul JIT al Node.js.4

- **Rol în Arhitectură:** Interfața API de mare viteză, responsabilă cu validarea strictă a schemelor de intrare folosind fastify-type-provider-zod.

## 2. Paradigma Arhitecturală: "Vertical Slice" în Context Medallion

Pentru piața din România, unde sursele de date sunt fragmentate (API-uri guvernamentale, fișiere Excel trimise pe email, scraping), o arhitectură monolitică stratificată (Layered Architecture) devine rapid un coșmar de mentenanță. În schimb, propunem o abordare hibridă: Vertical Slice Architecture aplicată peste un flux de date Medallion.

### 2.1. Deconstrucția "Vertical Slice"

În loc să avem straturi orizontale separate (Controller, Service, Repository) care traversează întreaga aplicație, vom organiza codul pe funcționalități de business (Features).

- **Exemplu:** Funcționalitatea "Onboarding Client Nou" (B2B) este o felie verticală care conține:
  - Ruta Fastify (Node.js) pentru primirea CUI-ului.
  - Schema Zod de validare.
  - Definiția tabelului bronze_onboarding (PostgreSQL).
  - Worker-ul Python pentru interogarea Termene.ro.
  - Logica de scriere în silver_companies.

Această "colocare" a codului permite echipelor (sau dezvoltatorului unic augmentat de AI) să modifice logica de îmbogățire a datelor fiscale fără a risca să "strice" logica de validare a emailurilor, deoarece cele două sunt complet decuplate.

### 2.2. Fluxul Medallion: De la Haos la Valoare

Conceptul Medallion (Data Lakehouse) este adaptat aici pentru un mediu tranzacțional PostgreSQL 18.1.

### 2.2.1. Stratul Bronze (Raw Ingestion)

Acesta este "zona de aterizare". Aici, integritatea datelor la intrare (fidelity) este mai importantă decât calitatea lor.

- **Stocare:** Tabele PostgreSQL partiționate lunar, cu o coloană principală raw_payload de tip JSONB.
- **Regulă:** Datele din Bronze sunt imuabile. Dacă procesul de îmbogățire eșuează sau logica se schimbă, putem oricând să re-procesăm datele originale din Bronze.
- **Context România:** Formate precum CSV-urile exportate din programele de contabilitate românești vechi (SAGA, WinMentor) au adesea probleme de encoding sau delimitatori. Stratul Bronze le acceptă "așa cum sunt" (Base64 encoded dacă e necesar), urmând ca Python să se ocupe de curățare.

### 2.2.2. Stratul Silver (Enriched & Validated)

Acesta este stratul operațional. Datele de aici sunt tipizate strict, validate fiscal și deduplicate.

- **Transformare:** Câmpurile JSON sunt extrase în coloane relaționale (VARCHAR, DECIMAL, BOOLEAN).
- **Îmbogățire:** Datele sunt completate cu informații de la terți (CAEN, Adresă, Solvabilitate).
- **Validare:** Se aplică reguli de business stricte (ex: un CUI trebuie să fie valid conform algoritmului modulo 11).

## 3. Faza I: Strategia de Ingestie (Node.js & Fastify)

Punctul de intrare în sistem este critic. Trebuie să fie capabil să suporte spike-uri de trafic (ex: importuri masive la sfârșitul lunii fiscale) fără a bloca resursele.

### 3.1. Configurare Fastify v5.6.2 pentru Securitate și Performanță

Având în vedere vulnerabilitatea Node.js v24.13 activă până pe 7 ianuarie, configurarea Fastify trebuie să fie paranoică.
Schema de Validare (Zod):
> Utilizăm fastify-type-provider-zod pentru a defini contractul API. Pentru stratul Bronze, validarea este intenționat relaxată pe conținut, dar strictă pe metadate.

```TypeScript
// src/features/ingestion/schema.ts
import { z } from 'zod';

// Schema pentru "plicul" de date (Envelope)
export const IngestionPayloadSchema = z.object({
  source_system: z.enum(),
  correlation_id: z.string().uuid().optional(), // Pentru tracing
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
  // Payload-ul efectiv este un obiect generic, permițând flexibilitate maximă în Bronze
  data: z.record(z.string(), z.unknown())
});

export type IngestionPayload = z.infer<typeof IngestionPayloadSchema>;
```

Implementarea Rutei (Vertical Slice):
> Ruta nu face nicio procesare. Doar persistă și notifică. Acest pattern "Fire-and-Forget" asigură un răspuns sub 10ms către client.

```TypeScript

// src/features/ingestion/route.ts
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { IngestionPayloadSchema } from './schema';
import { db } from '../../db'; // Drizzle Instance
import { bronzeTable } from '../../db/schema';
import { enrichmentQueue } from '../../queues'; // BullMQ Instance

export const ingestionRoute: FastifyPluginAsyncZod = async (app) => {
  app.post('/api/v1/ingest', {
    schema: {
      body: IngestionPayloadSchema,
      response: {
        202: z.object({ id: z.string(), status: z.enum() })
      }
    },
    // Măsuri de securitate pentru fereastra 5-7 Ianuarie
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute'
      }
    }
  }, async (req, reply) => {
    // 1. Persistență în PostgreSQL 18 (Bronze)
    const [record] = await db.insert(bronzeTable).values({
      source_system: req.body.source_system,
      raw_payload: req.body.data,
      ingested_at: new Date(),
      processing_status: 'PENDING'
    }).returning({ id: bronzeTable.id });

    // 2. Pasarea responsabilității către Python (via Redis)
    await enrichmentQueue.add('enrichment_job', {
      bronze_id: record.id,
      payload: req.body.data
    });

    return reply.status(202).send({
      id: record.id,
      status: 'QUEUED'
    });
  });
};
```

### 3.2. Proiectarea Stratului Bronze în PostgreSQL 18.1

Pentru a gestiona volumul, folosim partiționarea declarativă nativă din PostgreSQL 18.

```SQL

-- Definiția tabelei Bronze
CREATE TABLE bronze_leads (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    source_system VARCHAR(50) NOT NULL,
    raw_payload JSONB NOT NULL,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    error_log TEXT,
    CONSTRAINT pk_bronze_leads PRIMARY KEY (id, ingested_at)
) PARTITION BY RANGE (ingested_at);

-- Partiție pentru Ianuarie 2026
CREATE TABLE bronze_leads_2026_01 PARTITION OF bronze_leads
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

> **Notă Strategică:** Utilizarea JSONB în PostgreSQL 18.1 este extrem de performantă. Putem crea indexuri pe cheile din JSONB (ex: raw_payload->>'cui') pentru a verifica rapid dacă o companie a mai fost importată, chiar înainte de a o procesa în Silver.

## 4. Faza II: Mecanismul de Tranziție (Queue Management)

Legătura dintre Node.js (Ingestie) și Python (Procesare) este realizată prin BullMQ peste Redis.

### 4.1. Pattern-ul de Comunicare

De ce BullMQ și nu Kafka sau RabbitMQ? Pentru ecosistemul Node.js/Typescript, BullMQ (versiunea compatibilă cu Redis 7+) oferă cel mai bun raport complexitate/funcționalitate.6 Suportă nativ "delayed jobs" (utile pentru backoff la rate-limits API) și prioritizare.

- **Producător (Node.js):** Adaugă un Job care conține doar bronze_id. Nu trimitem tot payload-ul prin Redis pentru a nu încărca memoria. Worker-ul va citi payload-ul din Postgres.

- **Consumator (Python):** Deși BullMQ este o bibliotecă Node.js, putem consuma cozile din Python folosind o implementare compatibilă sau un wrapper ușor care respectă structura de date Redis a BullMQ. Alternativ, pentru stiva strictă definită, putem folosi o coadă Redis simplă (RPUSH/BLPOP) gestionată manual dacă interoperabilitatea BullMQ-Python este complexă, dar recomandarea este utilizarea structurilor standard pentru vizibilitate.

## 5. Faza III: Motorul de Îmbogățire (Python 3.14.1 Worker)

Aici are loc transformarea propriu-zisă. Worker-ul Python 3.14.1 este "inima" sistemului.

### 5.1. Revoluția Free-Threading în Procesarea Datelor

Implementarea worker-ului în Python 3.14.1 "No-GIL" schimbă fundamental arhitectura.

- **Înainte (Python 3.13 și mai vechi):** Pentru a procesa 100 de lead-uri în paralel, trebuia să lansăm 100 de procese sau să folosim asyncio (care este cooperativ, nu paralel). Multiprocesarea consuma 100x memorie.

- **Acum (Python 3.14.1):** Putem lansa 100 de fire de execuție (threads) reale. Acestea rulează pe nuclee CPU diferite simultan. XML-ul de la ANAF poate fi parsat pe Core 1 în timp ce Core 2 face un request HTTP și Core 3 calculează un hash criptografic.1

Configurarea Worker-ului:
> Este necesară instalarea versiunii cp314-cp314t (t vine de la threaded) și compilarea bibliotecilor C-extension cu suport pentru lipsa GIL.

### 5.2. Sub-Strategia A: Validarea Identității Fiscale (Termene.ro)

Pentru orice entitate B2B din România, "Codul Fiscal" (CUI) este cheia primară.

  1. Algoritmul de Procesare: Extracție și Sanitizare: Se extrage CUI-ul din raw_payload. Se elimină prefixul "RO" (dacă există) și spațiile.

  2. Validare Matematică (Offline): Înainte de a consuma credite API, aplicăm algoritmul Modulo 11 (standardul românesc pentru cifre de control). Dacă checksum-ul e invalid, marcăm direct în Silver cu status: INVALID_CUI.

  3. Interogare API Termene.ro:
     - Endpoint: <https://api.termene.ro/v2/dateFirmaSumar>
     - Autentificare: Token Basic Auth.
     - Parametri: tip=0 (pentru date realtime, esențial pentru verificarea TVA).

Maparea Răspunsului în Silver:
> API-ul returnează câmpuri text care trebuie normalizate într-un Enum PostgreSQL (fiscal_status_enum).

| Valoare Termene API (statut_fiscal) | Valoare Silver Enum | Acțiune de Business                       |
| ----------------------------------- | ------------------- | ----------------------------------------- |
| ACTIVA                              | ACTIVE              | Client eligibil. Se continuă îmbogățirea. |
| INACTIVA                            | INACTIVE            | Client riscant. Flag "Needs Approval".    |
| RADIATA                             | RADIATED            | Client mort. Se oprește procesarea.       |
| ANULARE TVA                         | SUSPENDED           | Alertă majoră fraudă.                     |
| RADIATA                             | RADIATED            | Client mort. Se oprește procesarea.       |
| ANULARE TVA                         | SUSPENDED           | Alertă majoră fraudă.                     |

Exemplu de cod Python (Threading + Asyncio):
Utilizăm asyncio pentru I/O (rețea) și Threading pentru parsing-ul JSON/XML greu, profitând de Python 3.14.9

```Python

import asyncio
import httpx
from concurrent.futures import ThreadPoolExecutor

# Executor pentru task-uri CPU-bound (No-GIL enabled in Py 3.14)

cpu_executor = ThreadPoolExecutor(max_workers=8)

async def enrich_company(cui: str):
    # 1. Network Call (I/O Bound - Asyncio)
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"<https://api.termene.ro/v2/dateFirmaSumar?cui={cui}&tip=0>",
                headers={"Authorization": f"Basic {API_KEY}"}
            )
            data = response.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                # Logica de retry backoff
                return {"status": "RETRY"}
            return {"status": "ERROR"}

    # 2. Parsing & Logic (CPU Bound - Rulat în thread real paralel)
    # În Python 3.14, acest cod rulează simultan cu alte request-uri pe alte core-uri
    silver_data = await asyncio.get_running_loop().run_in_executor(
        cpu_executor, 
        transform_to_silver_schema, 
        data
    )
    
    return silver_data

def transform_to_silver_schema(api_data):
    # Logică intensivă de mapare și validare
    status_map = {"ACTIVA": "ACTIVE", "INACTIVA": "INACTIVE"}
    return {
        "fiscal_status": status_map.get(api_data.get("statut_fiscal"), "UNKNOWN"),
        "vat_payer": api_data.get("statut_TVA") == "PLATITOR",
        #... alte câmpuri
    }
```

### 5.3. Sub-Strategia B: Validarea Datelor de Contact (HLR & Email)

Datele de contact din România sunt adesea introduse greșit (ex: 021... tratat ca mobil, sau lipsa prefixului +40).

#### 5.3.1. HLR Lookup (Mobile)

Utilizăm un serviciu HLR (ex: CheckMobi sau LabsMobile - furnizori cu acoperire bună pe RO) pentru a verifica starea numărului.

- **Optimizare de Cost:** Nu facem HLR pentru orice număr.
  - Dacă începe cu 02 sau 03 -> Este fix (Landline). Se validează doar formatul, nu se face HLR (cost inutil).
  - Dacă începe cu 07 -> Este mobil. Se execută HLR.
- **Informații Critice:**
  - status: DELIVRD (Activ) vs UNDELIV (Închis/Neallocat).
  - ported: true -> Indică un utilizator sofisticat care și-a schimbat rețeaua.
  - roaming: true -> Posibil utilizator din diaspora (targetare diferită).

#### 5.3.2. Validare Email

Utilizăm servicii tranzacționale moderne precum Resend (sau integrări directe SMTP cu precauție).

- **Verificare MX:** Obligatorie. Verificăm dacă domeniul are servere de mail.
- **Role-Based Detection:** Adresele de tip office@, contact@, admin@ sunt marcate ca GENERIC. Adresele nume.prenume@ sunt marcate ca PERSONAL. În B2B, adresele personale au valoare mai mare.

### 5.4. Sub-Strategia C: Augmentarea Datelor prin Web Scraping

Uneori datele oficiale nu sunt suficiente (lipsesc site-ul web, descrierea comercială). Aici intervine scraping-ul.

Provocarea Crawl4AI pe Python 3.14:
Snippet-urile de cercetare indică o incompatibilitate a bibliotecii crawl4ai cu Python 3.14 din cauza dependenței grpcio.

- **Soluția Strategică:** Nu vom renunța la Python 3.14. Vom folosi Playwright direct (biblioteca pe care se bazează și Crawl4AI), care are compatibilitate confirmată.
- **Implementare:** Worker-ul Python lansează instanțe "headless" de Chromium pentru a extrage metadate (Title, Meta Description) de pe site-ul companiei (dacă există în datele de intrare). Aceste texte sunt apoi trecute printr-un LLM (vezi secțiunea următoare) pentru a deduce industria.

### 5.5. Sub-Strategia D: Structurarea AI cu Grok (Structured Outputs)

Pentru datele nestructurate (ex: "Descrierea activității" de pe site-ul web sau un câmp de observații liber), folosim API-ul xAI Grok (compatibil OpenAI SDK) pentru a extrage date structurate.16

- **Tehnica:** JSON Schema Enforcement (Pydantic/Zod).
- **Utilizare:** Trimitem textul brut la Grok și cerem un JSON care respectă schema noastră Silver (ex: extrage nume_contact, pozitie, interes_produs). Acest lucru transformă textul liber în date interogabile SQL.

## 6. Faza IV: Stratul Silver - Persistență și Integritate (PostgreSQL 18.1)

Stratul Silver este destinația finală a procesului de îmbogățire. Aici datele sunt gata de consum pentru aplicațiile frontend (Refine) sau analize BI.

### 6.1. Schema Relatională Avansată

În PostgreSQL 18.1, profităm de tipurile ENUM native și de constrângeri pentru a garanta integritatea.

```SQL

-- Definire Tipuri Enum [17]
CREATE TYPE company_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'RADIATED');
CREATE TYPE verification_level AS ENUM ('NONE', 'BASIC', 'FULL_FISCAL', 'VERIFIED_CONTACT');

-- Tabela Silver Companii
CREATE TABLE silver_companies (
    cui VARCHAR(15) PRIMARY KEY, -- Cheie naturală unică
    company_name VARCHAR(255) NOT NULL,
    -- Coloană generată virtual pentru căutare rapidă (New in PG)
    search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('romanian', company_name)) STORED,

    status company_status NOT NULL DEFAULT 'ACTIVE',
    address_siruta_code INT, -- Link către tabela SIRUTA (externă)
    
    -- Date fiscale îmbogățite
    is_vat_payer BOOLEAN DEFAULT FALSE,
    is_vat_split BOOLEAN DEFAULT FALSE, -- TVA la încasare
    
    verification_level verification_level DEFAULT 'NONE',
    last_enriched_at TIMESTAMPTZ,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela Silver Contacte
CREATE TABLE silver_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_cui VARCHAR(15) REFERENCES silver_companies(cui),
    email VARCHAR(255),
    phone VARCHAR(20),

    -- Rezultate HLR/Validation
    is_phone_valid BOOLEAN,
    phone_carrier VARCHAR(50), -- ex: "Orange Romania"
    is_email_deliverable BOOLEAN
);
```

### 6.2. Drizzle ORM și State Machine

În aplicația Node.js, folosim Drizzle ORM pentru a interacționa cu această schemă. Drizzle ne permite să definim "mașini de stare" (State Machines) implicite prin tipuri TypeScript stricte generate din schema bazei de date.5
De exemplu, interfața Refine nu va putea afișa un buton de "Generează Factură" dacă status-ul companiei din Silver nu este ACTIVE. Această logică este impusă la nivel de bază de date și propagată prin tipuri până în UI.

## 7. Operațiuni, Securitate și Conformitate

### 7.1. Gestionarea Ferestrei de Vulnerabilitate (5-7 Ianuarie)

Așa cum am identificat în raportul inițial 1, Node.js v24 are o vulnerabilitate critică nerezolvată în primele zile din an.

Plan de Mitigare:

- **Header Stripping:** Fastify trebuie configurat să elimine orice header HTTP non-standard înainte de a procesa cererea. Multe atacuri pe V8 vizează parsarea headerelor malițioase.
- **Payload Size Limit:** Restricționarea drastică a dimensiunii body-ului la 1MB (față de default-ul mai permisiv) pentru a preveni atacurile de tip Buffer Overflow.
- **Monitorizare Activă:** Activarea logării detaliate în SigNoz pentru orice cerere care returnează coduri 4xx sau 5xx, pentru a detecta tentativele de "probing".

### 7.2. Conformitate GDPR și ANAF

- **Dreptul de a fi uitat:** Dacă un prospect cere ștergerea datelor, arhitectura permite ștergerea din silver_contacts (date personale) păstrând însă în silver_companies datele companiei (date publice, non-GDPR), asigurând continuitatea istorică.
- **Auditare Fiscală:** Folosind RETURNING OLD din Postgres 18, orice modificare a statusului fiscal (ex: din PLĂTITOR TVA în NEPLĂTITOR) este salvată într-un tabel audit_log automat. Acest lucru este crucial în cazul unui control ANAF, pentru a demonstra de ce s-a emis o factură cu/fără TVA la o anumită dată.

## 8. Concluzii și Recomandări Finale

Această strategie transformă stiva tehnologică "Ianuarie 2026" dintr-o listă de versiuni într-un sistem coerent de înaltă performanță.

1. **Adoptați Python 3.14.1 Free-Threaded imediat:** Este avantajul competitiv major. Reduce costurile de infrastructură (mai puține containere Docker necesare) și accelerează timpul de îmbogățire a datelor.

2. **Izolați Ingestia (Node) de Procesare (Python):** Utilizarea cozilor BullMQ este vitală. Ea permite ca ingestia să rămână rapidă (Node.js excelează aici) chiar și când workerii Python sunt saturați cu procesarea datelor complexe de la ANAF.

3. **Strictness în Silver, Flexibilitate în Bronze:** Nu validați excesiv la intrare. Lăsați datele să intre în Bronze, apoi curățați-le. Aceasta previne pierderea datelor din cauza unor erori minore de formatare.

Prin implementarea acestei arhitecturi "Vertical Slice" pe structura Medallion, organizația dumneavoastră va dispune de un sistem robust, capabil să transforme datele brute din piața românească în oportunități de afaceri clare și acționabile.

## Lucrări citate

1. 2_Tehnologii Active Ianuarie 2026.md </var/www/CerniqAPP/Documentatii/2_Tehnologii Active Ianuarie 2026.md>

2. Python Free-Threading Guide, accesată pe ianuarie 6, 2026, <https://py-free-threading.github.io/>

3. [FEATURE]:PostgreSQL 18 RETURNING OLD/NEW support #5109 - GitHub, accesată pe ianuarie 6, 2026, <https://github.com/drizzle-team/drizzle-orm/issues/5109>

4. V5 Migration Guide - Fastify, accesată pe ianuarie 6, 2026, <https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/>

5. 1_Roadmap Paralel Vanzari AI - Cerniq.app.md </var/www/CerniqAPP/Documentatii/1_Roadmap Paralel Vanzari AI - Cerniq.app.md>

6. Better queue markers in BullMQ v5, accesată pe ianuarie 6, 2026, <https://bullmq.io/news/231204/better-queue-markers/>

7. Unlocking True Parallelism: A Developer's Guide to Free-Threaded Python 3.14, accesată pe ianuarie 6, 2026, <https://dev.to/mechcloud_academy/unlocking-true-parallelism-a-developers-guide-to-free-threaded-python-314-175i>

8. Cea mai mare baza de date API Documentation - Termene, accesată pe ianuarie 6, 2026, <https://termene.ro/static/pdf_marketing/API_Documentation.pdf>

9. Scaling asyncio on Free-Threaded Python - Quansight Labs, accesată pe ianuarie 6, 2026, <https://labs.quansight.org/blog/scaling-asyncio-on-free-threaded-python>

10. Number verification & HLR Lookup Pricing - CheckMobi, accesată pe ianuarie 6, 2026, <https://checkmobi.com/pricing/lookup-api/SE>

11. HLR lookup in Romania – Phone Validation Services inRomania - Data Soap, accesată pe ianuarie 6, 2026, <https://www.datasoap.co.uk/hlr/europe/romania>

12. The 7 Best Email Verification APIs for Developers - Resend, accesată pe ianuarie 6, 2026, <https://resend.com/blog/best-email-verification-apis>

13. [Bug]: unable to install to python 3.14 due to grpcio library · Issue #1649 - GitHub, accesată pe ianuarie 6, 2026, <https://github.com/unclecode/crawl4ai/issues/1649>

14. Installation - Crawl4AI Documentation (v0.7.x), accesată pe ianuarie 6, 2026, <https://docs.crawl4ai.com/core/installation/>

15. Installation | Playwright Python, accesată pe ianuarie 6, 2026, <https://playwright.dev/python/docs/intro>

16. Structured Outputs - xAI API, accesată pe ianuarie 6, 2026, <https://docs.x.ai/docs/guides/structured-outputs>
