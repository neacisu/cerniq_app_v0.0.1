# Etapa 2 - Proiectarea și Implementarea Subsistemului Distribuit de Cold Outreach (Ediția Ianuarie 2026)

## 1. Introducere Executivă și Context Operațional Critic

### 1.1. Viziunea Strategică și Obiectivele Etapei 2

Prezentul document constituie specificația tehnică exhaustivă și manualul de implementare pentru **"Etapa 2: Cold Outreach"**, un pilon fundamental în cadrul ecosistemului de automatizare a vânzărilor definit în roadmap-ul strategic organizațional.3 În timp ce Etapa 1 s-a concentrat pe constituirea "Depozitului Unic de Adevăr" prin îmbogățirea datelor (Data Enrichment), Etapa 2 marchează tranziția către acțiune cinetică: orchestrarea unei campanii de comunicare multicanal la scară largă, guvernată de precizie chirurgicală și rigoare algoritmică.

Obiectivul central este ingineria unui sistem distribuit capabil să gestioneze o infrastructură complexă de **20 de numere de telefon proprietare (WhatsApp)** și o rotație sofisticată a conturilor de email, operând sub constrângeri stricte de rate-limiting semantic. Sistemul nu este doar un simplu expeditor de mesaje; este un **motor de decizie în timp real** care trebuie să navigheze balanța fină între volum (necesar pentru pipeline-ul de vânzări) și reputație (necesară pentru longevitatea infrastructurii).

La data de **5 Ianuarie 2026**, peisajul tehnologic oferă oportunități fără precedent. Maturizarea stivei "Active Technologies" 4 — specific **Node.js v24.13** pentru I/O non-blocant și **Python 3.14.1 (Free-Threaded)** pentru execuție paralelă reală — permite o densitate de procesare care, istoric, ar fi necesitat clustere de servere costisitoare. Acest raport detaliază modul în care aceste tehnologii sunt mobilizate pentru a reduce costurile operaționale și a maximiza randamentul fiecărui "agent digital" (număr de telefon sau inbox).

### 1.2. Definirea Constrângerilor de Business și Tehnice

Arhitectura propusă este sculptată strict în jurul unui set de cerințe nefuncționale și reguli de business imperativ, derivate din analiza documentației interne și a limitărilor platformelor terțe:

1. **Arhitectura Clusterului WhatsApp (20 Agenți):** Sistemul trebuie să gestioneze **20 de numere de telefon distincte**, integrate printr-un strat de abstractizare (TimelinesAI sau Wamm.pro). Acestea nu sunt simple canale de ieșire, ci entități cu stare (stateful entities), fiecare având propria reputație, istoric și cotă de activitate.  
2. **Rate Limiting Semantic și Diferențiat:** Cerința critică de **maxim 200 de contacte *noi* pe zi per număr**, în timp ce mesajele de tip "follow-up" rămân nelimitate, impune o arhitectură care înțelege *contextul* mesajului. Un rate limiter standard (token bucket) este insuficient, deoarece nu poate distinge între o "inițiere" (costisitoare pentru cotă) și o "continuare" (gratuită pentru cotă). Aceasta necesită implementarea unui "Quota Guardian" inteligent.5  
3. **Segregarea Strictă a Canalelor de Email (AUP Compliance):** Analiza politicilor de utilizare (Acceptable Use Policy \- AUP) ale furnizorilor de infrastructură 7 dictează o separare fizică și logică a fluxurilor. **Instantly.ai** va gestiona volumul de "cold outreach" (datorită mecanismelor native de warm-up și rotație), în timp ce **Resend/AWS SES** va fi rezervat exclusiv pentru traficul tranzacțional și interacțiunile cu prospecții "încălziți" (warm leads), pentru a proteja domeniile principale de blacklisting.  
4. **Imuabilitatea Stivei Tehnologice:** Implementarea va respecta cu strictețe deciziile din Faza 1 5: Node.js v24 pentru orchestrare, Python 3.14 pentru workeri, PostgreSQL 18 pentru persistență (Stratul Gold) și Fastify v5 pentru interfețele API interne.

## 2. Paradigma Arhitecturală: Extinderea Modelului "Vertical Slice"

În conformitate cu filosofia "Vertical Slice Architecture" adoptată pentru a minimiza încărcarea cognitivă a echipei de dezvoltare 3, Etapa 2 nu este implementată ca un serviciu monolitic adăugat, ci ca o extensie naturală a fluxului de date Medallion. Dacă Etapa 1 a transformat datele din Bronze în Silver, Etapa 2 este responsabilă pentru activarea acestor date în stratul **Gold** (Context Operațional) și gestionarea efectelor secundare (trimiterea mesajelor).

### 2.1. Evoluția Modelului de Date (The Gold Layer)

În arhitectura noastră, stratul **Gold** nu conține doar date agregate pentru raportare, ci reprezintă **starea vie a sistemului de angajare**. Aici, datele statice din Silver (ex: CUI, Nume Companie) devin dinamice.

Tabelul gold_lead_journey (PostgreSQL 18):  
Acesta este punctul central de coordonare. Spre deosebire de modelele CRM tradiționale care sunt adesea rigide, acest tabel funcționează ca o mașină de stare (State Machine) pentru fiecare prospect.

| Coloană                | Tip Date    | Descriere Funcțională.                                                                                            |
| ---------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| lead_id                | UUID (PK)   | Referință către silver_companies.                                                                                 |
| assigned_phone_id      | UUID (FK)   | ID-ul intern al numărului WhatsApp alocat. Alocare **sticky** pentru a asigura continuitatea conversației.        |
| engagement_stage       | ENUM        | Starea curentă: COLD, CONTACTED_WA, CONTACTED_EMAIL, WARM_REPLY, CONVERTED, DEAD.                                 |
| quota_consumption_date | DATE        | Data la care acest lead consuma o unitate din cota de "inițiere" (new contact). Indexat pentru verificări rapide. |
| last_channel_used      | ENUM        | WHATSAPP, EMAIL_INSTANTLY, EMAIL_RESEND.                                                                          |
| next_action_at         | TIMESTAMPTZ | Timestamp pentru planificarea următorului pas din secvență (follow-up).                                           |
| sentiment_score        | INT         | Scat calculat de Python (via LLM) pe baza răspunsurilor primite (-100 la +100).                                   |

### 2.2. Componente de Sistem Noi

Pentru a susține complexitatea distribuției pe 20 de noduri de comunicare, introducem patru componente logice noi în arhitectura existentă Node-Python:

1. **The Outreach Orchestrator (Node.js v24):**  
   * Acționează ca un "dispecer". Nu trimite mesaje.  
   * Interoghează periodic stratul Silver pentru lead-uri eligibile.  
   * Aplică logica de alocare a numerelor (Round Robin ponderat).  
   * Injectează job-uri în cozile BullMQ specifice.  
2. **The Quota Guardian (Redis 7 \+ Lua):**  
   * Un modul critic de guvernare care aplică regula de "200 new/day".  
   * Utilizează scripturi Lua pentru a garanta atomicidatea verificării și incrementării contoarelor, prevenind condițiile de cursă (race conditions) în mediul concurent Python.  
3. **The Communication Gateway (Python 3.14):**  
   * Executantul. Consumă job-urile din cozi.  
   * Folosește asyncio pe fire de execuție native (Free-Threading) pentru a gestiona sute de conexiuni HTTP simultane către TimelinesAI și Instantly.  
4. **The Feedback Loop (Fastify Webhooks):**  
   * Punctul de ingestie pentru evenimentele externe (Reply, Bounce, Delivery).  
   * Normalizează payload-urile heterogene de la diferiți furnizori într-un format intern standardizat.

## 3. Strategia Tehnică pentru Clusterul WhatsApp (20 Numere)

Gestionarea a 20 de numere WhatsApp proprietare reprezintă cea mai mare provocare tehnică a Etapei 2\. Spre deosebire de email, unde rotația IP-urilor este standardizată, WhatsApp impune o legătură "fizică" între dispozitiv și cont.

### 3.1. Analiza Comparativă și Selecția Providerului: TimelinesAI vs. Wamm.pro

Pentru a integra 20 de numere *fără* a utiliza API-ul oficial Cloud API (care ar impune costuri per conversație și template-uri rigide), avem nevoie de un furnizor de tip "WhatsApp Web Automation / Shared Inbox".

> **Opțiunea A: TimelinesAI**

* **Arhitectură:** Funcționează ca un agregator de sesiuni Multi-Device. Permite scanarea codului QR pentru fiecare număr.  
* **Model Pricing:** Tarifare per "seat" (loc). Planul "CRM Integration" costă aproximativ $25/lună/seat. Pentru 20 de numere, costul este de **$500/lună**.  
* **API:** Oferă un API REST unificat pentru trimiterea mesajelor și Webhooks pentru recepție.12  
* **Limitări:** Rate limits definite per seat (ex: 50-500 mesaje mass/zi în funcție de plan).10 Totuși, trimiterea 1-to-1 este tehnic "nelimitată", fiind constrânsă doar de mecanismele anti-spam ale WhatsApp.  
* **Avantaj Strategic:** Capacitatea de "Shared Inbox" este vitală pentru supravegherea umană. Echipa poate vedea toate cele 20 de fluxuri într-o singură interfață, ceea ce Wamm.pro sau soluțiile pure-API nu oferă la același nivel de maturitate.

> **Opțiunea B: Wamm.pro**

* **Arhitectură:** Wrapper peste protocoalele WhatsApp, orientat spre automatizare (n8n/Make).  
* **Cost:** Model potențial mai flexibil, dar documentația publică este limitată privind managementul a 20 de instanțe simultane într-un singur dashboard.  
* **Risc:** Soluțiile mai puțin mature prezintă un risc mai mare de instabilitate a conexiunii (deconectări frecvente ale sesiunii Web).

> **Decizia de Arhitectură**:  
Vom utiliza TimelinesAI ca infrastructură principală datorită stabilității API-ului și funcției de Shared Inbox, esențială pentru calitatea controlului. Costul de $500 este justificat de reducerea riscului operațional (blocarea numerelor din cauza unor implementări API instabile). Arhitectura va fi însă construită cu un Adapter Pattern în Python, permițând comutarea la Wamm.pro sau o instanță self-hosted (ex: Baileys) dacă costurile devin prohibitive la scară.

### 3.2. Implementarea "Quota Guardian" cu Redis și Lua

Limitarea la **200 de contacte noi pe zi** per număr este o regulă de business *hard*. Rate limiterele din BullMQ 6 controlează debitul (ex: 5 mesaje/secundă), dar nu pot distinge semantic între un mesaj "Nou" și unul "Follow-up".

Soluția: Token Bucket Semantic în Redis  
Vom implementa un mecanism customizat în Redis. Cheia de limitare va fi compusă din: quota:wa:{phone\_id}:{date\_iso}.  
Algoritmul Scriptului Lua (Execuție Atomică):  
Acest script este apelat de workerul Python înainte de a trimite orice mesaj.

```Lua

    -- KEYS[1]: Cheia cotei (ex: quota:wa:123e4567-e89b...:2026-01-05)  
    -- ARGV[1]: Limita maximă (200)  
    -- ARGV[2]: Costul operațiunii (1 pentru New, 0 pentru Follow-up)

local current_usage = tonumber(redis.call("GET", KEYS[1]) or "0")  
local cost = tonumber(ARGV[2])  
local limit = tonumber(ARGV[1])

    -- Dacă este un mesaj de follow-up (cost 0), permitem întotdeauna  
if cost == 0 then  
    return 1 -- ALLOWED  
end

    -- Pentru mesaje noi, verificăm limita  
if current_usage + cost > limit then  
    return 0 -- REJECTED (Quota Exceeded)  
end

    -- Incrementăm și setăm TTL (48h pentru siguranță)  
redis.call("INCRBY", KEYS[1], cost)  
redis.call("EXPIRE", KEYS[1], 172800)

return 1 -- ALLOWED

```

**Integrarea în Fluxul Python:**

1. Workerul primește job-ul: { type: 'WHATSAPP_SEND', is_new_lead: true, phone_id: '...', body: '...' }.  
2. Dacă is_new_lead == true, apelează scriptul Lua cu cost 1.  
3. Dacă primește 0 (REJECTED), workerul **nu** marchează job-ul ca eșuat. În schimb, folosește funcționalitatea job.moveToDelayed din BullMQ pentru a reprograma execuția pentru ora 09:00 a zilei următoare.  
4. Această abordare asigură că nu pierdem lead-uri, ci doar le amânăm ("backpressure"), menținând numerele în siguranță.

### 3.3. Topologia Cozilor (Queue Topology)

Pentru a evita efectul de "Head-of-Line Blocking" (unde un număr blocat sau lent oprește procesarea pentru celelalte), nu vom folosi o singură coadă globală.

**Strategia Multi-Queue:**

* **Dispatcher Queue:** O coadă unică unde Orchestratorul Node.js plasează intențiile de comunicare.  
* **Router Worker:** Un proces ușor care ia job-urile din Dispatcher și le mută în cozi specifice per număr.  
* **Per-Phone Queues:** Vom crea dinamic **20 de cozi distincte** în Redis (q:wa:phone_01... q:wa:phone_20).  
* **Concurrency:** Fiecare coadă per-telefon va avea o concurență setată la **1**. Acest lucru forțează procesarea secvențială pe fiecare număr, mimând comportamentul uman și prevenind trimiterea simultană a 5 mesaje de pe același număr (ceea ce ar declanșa imediat algoritmi anti-spam).

## 4. Strategia de Email: Segregarea Riscului și Routing Hibrid

Cercetarea 16 confirmă un consens critic în 2026: **Utilizarea furnizorilor tranzacționali (AWS SES, Resend) pentru Cold Email este o cale sigură către suspendare.** Politicile AUP (Acceptable Use Policy) sunt extrem de stricte privind "unsolicited mail".

### 4.1. Arhitectura Duală a Canalelor de Email

Sistemul va implementa un "Email Router" logic care direcționează traficul în funcție de stadiul relației cu prospectul.

* **Canalul A: "The Hunter" (Cold Outreach via Instantly.ai)**:
  * **Scop:** Inițierea contactului, volum mare, risc ridicat de raportare spam.  
  * **Tehnologie:** **Instantly.ai** (prin API v2).18  
  * **Mecanism:** Instantly gestionează "Inbox Rotation". Noi nu conectăm un singur cont de email, ci un pool de 50-100 de conturi (domenii secundare) în Instantly. API-ul nostru doar "alimentează" campaniile.  
  * **Flux Tehnic:**  
    1. Workerul primește job SEND_EMAIL_COLD.  
    2. Nu trimite email-ul direct. Apelează endpoint-ul Instantly /api/v2/lead/add_to_campaign.  
    3. Instantly preia responsabilitatea de a alege inbox-ul, de a face warm-up și de a trimite.  
    4. Webhook-ul nostru ascultă evenimente de tip reply.

* **Canalul B: "The Farmer" (Warm/Transactional via Resend)**
  * **Scop:** Răspunsuri la lead-uri interesate, confirmări, trimitere de contracte.  
  * **Tehnologie:** **Resend** (sau AWS SES ca fallback).  
  * **Justificare:** Odată ce un prospect a răspuns ("Warm Lead"), comunicarea devine consensuală. Resend oferă o livrabilitate superioară (Inbox placement) și viteză instantanee, cruciale pentru negociere.  
  * **Protecție:** Codul trebuie să includă o gardă logică (assert) care împiedică trimiterea prin Resend dacă lead.status este NEW sau COLD. Încălcarea acestei reguli va genera o alertă critică în sistemul de monitorizare.

### 4.2. Monitorizarea Sănătății Domeniilor

Deși Instantly gestionează warm-up-ul, sistemul nostru trebuie să monitorizeze "pulsul" infrastructurii.

* **Telemetry Aggregation:** Workerul Python va interoga periodic endpoint-ul /api/v2/analytics din Instantly.22  
* **Circuit Breaker:** Dacă rata de bounce pe o campanie depășește **3%** (sub limita de pericol de 4-5% menționată în AUP-uri 7), sistemul va suspenda automat adăugarea de noi lead-uri în acea campanie și va notifica administratorul.

## 5. Motorul de Execuție: Simbioza Node.js - Python

Această secțiune detaliază implementarea "la firul ierbii", valorificând avantajele specifice ale versiunilor software din Ianuarie 2026\.

### 5.1. Workerii Python 3.14 cu Free-Threading

Pentru a gestiona I/O-ul pentru 20 de numere WhatsApp și fluxurile de email, un model tradițional Python (bazat pe procese sau asyncio simplu pe un singur core) ar fi sub-optim. Python 3.14 23 ne permite să rulăm fire de execuție reale în paralel.

* **Arhitectura Worker-ului:**

  * Vom lansa un singur proces Python (Container Docker).  
  * În acest proces, vom instanția **20 de thread-uri native**.  
  * Fiecare thread este "legat" (bound) de o coadă Redis specifică unui telefon (q:wa:phone_XX).  
  * **Beneficiu Major:** Memoria este partajată. Dicționarele uriașe de "Negative Keywords" sau cache-ul de template-uri sunt încărcate o singură dată în RAM și accesate de toate cele 20 de thread-uri, reducând amprenta de memorie de la ~2GB (20 procese) la ~300MB.

* **Cod Explicativ (Python 3.14 Concept):**

```Python

import threading  
from queue_consumer import consume_queue

def start_workers(phones):  
    threads = []  
    # Resursă partajată (Read-Only) - eficientă în Py 3.14 no-GIL  
    global_config = load_heavy_config()

    for phone in phones:  
        # Lansăm un thread real per număr  
        t = threading.Thread(  
            target=consume_queue,   
            args=(phone.id, global_config),  
            name=f"worker-{phone.id}"  
        )  
        t.start()  
        threads.append(t)  
          
    for t in threads:  
        t.join()

```

### 5.2. Integrarea cu Fastify (Node.js 24)

Node.js rămâne responsabil pentru interfața cu lumea exterioară (API) și ingestia rapidă.

* **Shielding:** Având în vedere vulnerabilitatea specifică ferestrei 5-7 Ianuarie 4, Fastify va fi configurat cu plugin-ul @fastify/helmet și o limită strictă de bodyLimit: 1048576 (1MB) pentru a preveni atacurile de tip Denial of Service prin payload-uri malițioase.  
* **Webhook Normalization:** Webhook-urile de la TimelinesAI vin într-un format, cele de la Instantly în altul. Fastify va utiliza **Zod** pentru a valida și transforma aceste payload-uri într-un eveniment intern canonic: SystemEvent { lead\_id, type: 'REPLY', content, source }.

## 6. Protocoale Operaționale și Securitate

### 6.1. Protocolul "Human Behavior" (Evitarea Ban-ului)

Pentru a proteja cele 20 de numere, sistemul nu trebuie să arate ca un robot.

1. **Jitter (Variație):** Între oricare două mesaje trimise de pe același număr, worker-ul va introduce o întârziere aleatorie: Sleep(30s + Random(0, 120s)).  
2. **Orar de Lucru:** "Quota Guardian" va respinge automat orice tentativă de trimitere în afara orelor 08:00 - 18:00 (fus orar local al prospectului), mutând job-ul în coada de așteptare.  
3. **Spintax:** Mesajele nu vor fi identice. Python va procesa template-uri de tip {Salut|Bună|Salutare}, asigurând că hash-ul conținutului variază suficient pentru a nu declanșa filtrele de "Bulk Messaging".

### 6.2. Gestionarea Erorilor și Reîncercarea

* **Erori Temporare (429, 503):** Se aplică o strategie de "Exponential Backoff" în BullMQ.  
* **Erori Critice (Auth Failed, Number Banned):**  
  * Dacă TimelinesAI returnează o eroare de autentificare, sistemul marchează numărul ca OFFLINE în baza de date.  
  * Se declanșează o alertă critică (via Slack/Discord/SMS) către administrator.  
  * Toate job-urile din coada acelui număr sunt "înghețate" (Paused) până la intervenția umană, pentru a nu pierde lead-urile.

## 7. Concluzii și Recomandări de Implementare

Această strategie tehnică transformă constrângerile severe ale proiectului (20 de numere, 200 limită, separare email) într-un avantaj structural. Arhitectura **distribuită**, dar central gestionată prin **Redis și PostgreSQL**, permite o scalare orizontală facilă.

**Pilonii Succesului:**

1. **Quota Guardian:** Fără logica Lua în Redis, riscul de a depăși limita de 200 și de a pierde numere este iminent. Aceasta este componenta critică non-negociabilă.  
2. **Email Routing:** Respectarea strictă a separării Instantly (Cold) vs. Resend (Warm) este singura modalitate de a menține livrabilitatea pe termen lung.  
3. **Free-Threading:** Adoptarea Python 3.14 reduce drastic costurile de infrastructură, permițând rularea întregului stack de outreach pe o instanță VPS modestă, în ciuda complexității logice.

**Recomandare Imediată:** Începeți implementarea cu **Săptămâna 1** (Infrastructura de cozi și Email), deoarece procesul de "warm-up" pentru domeniile de email în Instantly durează minim 14 zile 25, timp în care se poate dezvolta și testa integrările de WhatsApp.

## Tabel Sinoptic al Tehnologiilor și Rolurilor

| Rol Arhitectural   | Tehnologie / Platformă  | Configurație Specifică              | Motivare                            |
| ------------------ | ----------------------- | ----------------------------------- | ----------------------------------- |
| **API Gateway**    | **Node.js v24/Fastify** | Shielding activat, Rate Limit pe IP | Performanță I/O, Securitate         |
| **Outreach Logic** | **Python 3.14**         | Free-Threading (No-GIL)             | Paralelism masiv, Memorie eficientă |
| **WhatsApp Prov.** | **TimelinesAI**         | Plan "CRM Integration" (x20)        | Shared Inbox, Stabilitate vs. DIY   |
| **Cold Email**     | **Instantly.ai**        | API v2, Warm-up activ               | Rotație inbox automată, Volum       |
| **Warm Email**     | **Resend**              | SDK Standard                        | Reputație, Livrare rapidă           |
| **Quota DB**       | **Redis 7**             | Scripturi Lua atomice               | Rate limiting semantic precis       |
| **Queue Manager**  | **BullMQ**              | 20+ Cozi partiționate               | Izolarea defectelor per număr       |
| **Persistență**    | **PostgreSQL 18**       | Partitioning (Logs), JSONB          | Flexibilitate schemă, Audit         |

## Lucrări citate

1. Roadmap Paralel Vanzari AI - Cerniq.app  
2. Tehnologii Active Ianuarie 2026  
3. Etapa 1 - Strategie Data Enrichment Prospecti Romania  
4. Rate limiting | BullMQ, accesată pe ianuarie 6, 2026, [https://docs.bullmq.io/guide/rate-limiting](https://docs.bullmq.io/guide/rate-limiting)  
5. Acceptable Use Policy - Resend, accesată pe ianuarie 6, 2026, [https://resend.com/legal/acceptable-use](https://resend.com/legal/acceptable-use)  
6. Acceptable Use Policy & Anti-Spam - Outreach, accesată pe ianuarie 6, 2026, [https://www.outreach.io/acceptable-use-policy](https://www.outreach.io/acceptable-use-policy)  
7. TimelinesAI Plans and Pricing, accesată pe ianuarie 6, 2026, [https://timelines.ai/pricing/](https://timelines.ai/pricing/)  
8. TimelinesAI Plans and Pricing, accesată pe ianuarie 6, 2026, [https://timelines.ai/timelinesai-pricing/](https://timelines.ai/timelinesai-pricing/)  
9. WhatsApp Shared Inbox for Teams - Full Business Chat Control | TimelinesAI, accesată pe ianuarie 6, 2026, [https://timelines.ai/whatsapp-shared-inbox/](https://timelines.ai/whatsapp-shared-inbox/)  
10. TimelinesAI Changelog - Productlane, accesată pe ianuarie 6, 2026, [https://timelinesai.productlane.com/changelog](https://timelinesai.productlane.com/changelog)  
11. WAMM: Acasă, accesată pe ianuarie 6, 2026, [https://wamm.pro/](https://wamm.pro/)  
12. Easy whatsapp implementation (WAMM.pro) · Automation-Tribe-Free - Skool, accesată pe ianuarie 6, 2026, [https://www.skool.com/automation-tribe-free/easy-whatsapp-implementation-wammpro?p=a6609ddb](https://www.skool.com/automation-tribe-free/easy-whatsapp-implementation-wammpro?p=a6609ddb)  
13. Documentation - Api Whatsapp, accesată pe ianuarie 6, 2026, [https://wamessageapi.com/docs/en-us](https://wamessageapi.com/docs/en-us)  
14. The 11 best transactional email services for developers in 2026 - Knock.app, accesată pe ianuarie 6, 2026, [https://knock.app/blog/the-top-transactional-email-services-for-developers](https://knock.app/blog/the-top-transactional-email-services-for-developers)  
15. 5 Best Amazon SES Alternatives and Competitors in 2025 - Mailforge, accesată pe ianuarie 6, 2026, [https://www.mailforge.ai/blog/amazon-ses-alternatives](https://www.mailforge.ai/blog/amazon-ses-alternatives)  
16. API Explorer - Instantly API V2, accesată pe ianuarie 6, 2026, [https://developer.instantly.ai/api/v2](https://developer.instantly.ai/api/v2)  
17. Webhooks: Custom integrations for advanced outreach - Instantly API, accesată pe ianuarie 6, 2026, [https://instantly.ai/blog/api-webhooks-custom-integrations-for-outreach/](https://instantly.ai/blog/api-webhooks-custom-integrations-for-outreach/)  
18. Add leads to a campaign - Instantly API Documentation - Theneo, accesată pe ianuarie 6, 2026, [https://app.theneo.io/instantly-ai/instantlyapidocs/lead/add-leads-to-a-campaign](https://app.theneo.io/instantly-ai/instantlyapidocs/lead/add-leads-to-a-campaign)  
19. Adding Leads To A Campaign - Instantly Help Center, accesată pe ianuarie 6, 2026, [https://help.instantly.ai/en/articles/6253114-adding-leads-to-a-campaign](https://help.instantly.ai/en/articles/6253114-adding-leads-to-a-campaign)  
20. Analytics - Instantly API V2, accesată pe ianuarie 6, 2026, [https://developer.instantly.ai/api/v2/analytics](https://developer.instantly.ai/api/v2/analytics)  
21. What's new in Python 3.14 — Python 3.14.2 documentation, accesată pe ianuarie 6, 2026, [https://docs.python.org/3/whatsnew/3.14.html](https://docs.python.org/3/whatsnew/3.14.html)  
22. Python 3.14's Free-Threaded Build: A Technical Deep Dive | by Rajat Mishra - Medium, accesată pe ianuarie 6, 2026, [https://medium.com/@mishra.writeto/python-3-14s-free-threaded-build-a-technical-deep-dive-23b2aabd3ee3](https://medium.com/@mishra.writeto/python-3-14s-free-threaded-build-a-technical-deep-dive-23b2aabd3ee3)  
23. Guide For Agencies: How to send 1,000+ personalized cold emails per week - Instantly.ai, accesată pe ianuarie 6, 2026, [https://instantly.ai/blog/send-high-volume-personalized-cold-emails/](https://instantly.ai/blog/send-high-volume-personalized-cold-emails/)
