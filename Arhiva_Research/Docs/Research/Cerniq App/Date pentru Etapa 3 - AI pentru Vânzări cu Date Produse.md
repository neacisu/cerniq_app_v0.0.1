# **Integrarea Cunoștințelor de Produs și Arhitectura Agentului de Vânzări Neuro-Simbolic (Date pt. Etapa 3\)**

## **1\. Introducere Executivă: Paradigma "Zero Hallucination" în Automatizarea Vânzărilor**

Evoluția ecosistemului manager.neanelu.ro a atins un punct de inflexiune critic. După implementarea cu succes a "Etapei 2: Cold Outreach", care a stabilit infrastructura cinetică pentru angajamentul multi-canal distribuit (gestionând un cluster de 20 de numere WhatsApp și rotația conturilor de email) 1, roadmap-ul strategic impune acum activarea "Etapei 3: Product Knowledge Integration". Această fază nu reprezintă o simplă adăugare de funcționalități, ci o transformare fundamentală a naturii sistemului: tranziția de la un mecanism deterministic de livrare a mesajelor la un motor cognitiv de negociere autonomă.

Obiectivul central al acestei etape este eliminarea completă a halucinațiilor AI în conversațiile de vânzări. Într-un context comercial, o halucinație nu este o eroare abstractă, ci un risc financiar și reputațional direct. Un agent AI care oferă un produs ieșit din stoc, inventează specificații tehnice sau cotează un preț vechi subminează încrederea clientului și poate genera pierderi operaționale semnificative. Analiza literaturii de specialitate indică faptul că modelele de limbaj mari (LLM), prin natura lor probabilistică, sunt predispuse la confabulații atunci când nu sunt ancorate ("grounded") în date verficabile.2

Prezentul raport detaliază o strategie tehnică exhaustivă pentru a construi un sistem de vânzări "Neuro-Simbolic". Această abordare hibridă combină flexibilitatea lingvistică a rețelelor neurale (xAI Grok / OpenAI GPT-4o) cu rigiditatea factuală a sistemelor simbolice (Baze de date relaționale, reguli de business). Strategia se bazează pe stiva tehnologică "Active Technologies" din Ianuarie 2026: **Node.js v24.13** pentru orchestrarea de mare viteză, **Python 3.14.1 (Free-Threaded)** pentru procesare cognitivă paralelă și **PostgreSQL 18.1** ca motor de cunoștințe hibrid.4 Prin implementarea Protocolului Contextului Modelului (MCP) și a unei arhitecturi de căutare hibridă (Vectorială \+ Lexicală), ne propunem să transformăm "Golden Records" din simple intrări în baza de date în cunoștințe active, capabile să guverneze fiecare token generat de agentul de vânzări.

## **2\. Fundamentele Arhitecturale: Stiva Tehnologică Activă (Ianuarie 2026\)**

Selecția componentelor tehnologice pentru Etapa 3 nu este arbitrară, ci derivă din analiza capacităților specifice disponibile la începutul anului 2026\. Aceste tehnologii permit o densitate de procesare și o integritate a datelor care nu erau posibile în iterațiile anterioare ale stivelor web.

### **2.1. PostgreSQL 18.1: Motorul de Cunoștințe Hibrid**

În arhitectura propusă, PostgreSQL 18 nu mai funcționează doar ca un depozit pasiv de date relaționale, ci devine o platformă multi-modală activă. Lansarea versiunii 18.1 a introdus capabilități critice pentru sistemele RAG (Retrieval-Augmented Generation) performante.5

Integrarea Nativa a Vectorilor și Datelor Structurate:  
Spre deosebire de arhitecturile fragmentate care utilizează o bază de date vectorială separată (ex: Pinecone sau Milvus) alături de o bază de date tranzacțională, PostgreSQL 18 cu extensia pgvector permite stocarea embeddings-urilor (vectori semantici) în același rând cu datele operaționale (stoc, preț, SKU).7 Această unificare elimină problema "split-brain" (desincronizarea între baza de cunoștințe vectorială și realitatea stocurilor). Când un produs este actualizat în sistemul ERP/Shopify, modificarea se reflectă atomic atât în datele relaționale, cât și în indexul vectorial, garantând consistența absolută.10  
JSON\_TABLE și Procesarea Datelor Nestructurate:  
O inovație majoră în PostgreSQL 18 este suportul complet pentru funcția standard SQL:2023 JSON\_TABLE.6 În contextul proiectului Neanelu, datele de produs provenite din Shopify (Metafields, Metaobjects) sunt stocate în coloane JSONB pentru flexibilitate.10 Utilizarea JSON\_TABLE permite interogarea acestor structuri ierarhice complexe ca și cum ar fi tabele relaționale virtuale. Agentul AI poate genera interogări SQL care filtrează produse pe baza unor atribute arbitrare (ex: "material", "compatibilitate") fără a necesita o logică complexă de parsare JSON în stratul de aplicație.12  
Performanță și Compresie:  
Indexarea GIN (Generalized Inverted Index) optimizată în PG18 permite filtrarea atributelor JSONB cu o latență de ordinul milisecundelor, chiar și pe volume de milioane de înregistrări.10 Aceasta este vitală pentru experiența utilizatorului în chat – agentul trebuie să verifice stocul instantaneu, fără a întrerupe fluxul conversației.

### **2.2. Python 3.14.1: Workerul Cognitiv "Free-Threaded"**

Componenta de procesare a limbajului natural și de logică agentică este construită pe Python 3.14.1. Această versiune marchează un moment istoric prin eliminarea Global Interpreter Lock (GIL) în modul "free-threaded".5

Impactul asupra RAG și Inferenței:  
În arhitecturile anterioare (Python 3.12/3.13), gestionarea a sute de cereri concurente de generare de embeddings sau de apeluri LLM necesita utilizarea multiprocessing, ceea ce implica un overhead major de memorie (copierea contextului aplicației în fiecare proces). Cu Python 3.14, putem rula zeci de fire de execuție native (threads) în paralel în cadrul aceluiași proces.4  
Această capabilitate este esențială pentru "Etapa 3", deoarece permite:

1. **Paralelism Masiv:** Calcularea simultană a scorurilor de similaritate și reranking pentru zeci de sesiuni de chat active.  
2. **Memorie Partajată:** Încărcarea în memorie a unor modele locale de dimensiuni mici (ex: modele de reranking cross-encoder sau detectoare de limbaj) o singură dată, fiind accesibile tuturor thread-urilor fără duplicare.  
3. **Latență Redusă:** Eliminarea timpilor de serializare/deserializare a datelor între procese (pickle overhead), crucială pentru pipeline-urile RAG unde fiecare milisecundă contează.14

### **2.3. Node.js v24.13: Orchestratorul de Mare Debite**

Node.js rămâne "sistemul nervos" al arhitecturii, gestionând I/O-ul asincron și conexiunile WebSocket cu platformele de mesagerie (WhatsApp prin TimelinesAI).1 Versiunea v24 "Krypton" aduce optimizări semnificative ale motorului V8 și stabilitate pentru stream-uri.5

Rolul în Arhitectura Hibridă:  
Deși Python gestionează logica "grea" (AI), Node.js este responsabil pentru menținerea stării conexiunilor și pentru ingestia rapidă a datelor. Utilizarea stream-urilor Node.js v24 permite procesarea eficientă a webhook-urilor de la Shopify și actualizarea bazei de date în timp real, fără a bloca event loop-ul.10 De asemenea, Node.js acționează ca un "firewall" de securitate, validând și sanitizând input-urile de la utilizatori înainte ca acestea să ajungă la procesarea costisitoare din Python.

## **3\. Definirea și Modelarea "Golden Records": Sursa Unică de Adevăr**

Pentru ca un agent AI să nu halucineze, acesta trebuie să aibă acces la o reprezentare a realității care este completă, consistentă și actualizată. În ecosistemul Neanelu, această reprezentare este "Golden Record-ul", situat în stratul "Gold" al arhitecturii de date Medallion.10

### **3.1. Procesul de Rezoluție a Entităților și Schema de Date**

Golden Record-ul nu este o copie brută a datelor din Shopify; este o entitate sintetizată. Datele brute (Bronze) sunt curățate și normalizate (Silver), iar apoi trec printr-un proces de deduplicare și "Entity Resolution" pentru a forma înregistrarea finală (Gold).10

Schema Hibridă (Relational \+ JSONB):  
Arhitectura adoptă un model de date pragmatic care echilibrează rigoarea SQL cu flexibilitatea NoSQL 10:

* **Atribute Core (Relaționale):** Datele fundamentale, care necesită integritate referențială strictă și sunt folosite în \>90% din filtre, sunt stocate în coloane tipizate.  
  * sku (Text, Primary Key, Immutable)  
  * price (Decimal, pentru calcule financiare precise)  
  * stock\_quantity (Integer, supus constrângerilor de non-negativitate)  
  * shop\_id (UUID, esențial pentru izolarea multi-tenant prin RLS).10  
* **Atribute Flexibile (JSONB):** Specificațiile tehnice variabile, descrierile de marketing și atributele specifice nișei sunt stocate într-o coloană attributes de tip jsonb.  
  * Exemplu: {"specs": {"ram": "16GB", "cpu": "M3"}, "marketing": {"tagline": "Pro Performance"}}.  
  * Acestea sunt indexate folosind **GIN (Generalized Inverted Index)** cu operatorul jsonb\_path\_ops, permițând căutări extrem de rapide de tipul "Găsește toate produsele unde attributes-\>specs-\>ram este '16GB'".11

Vizualizări Materializate pentru AI:  
Pentru a optimiza consumul de către agentul AI, se definește o Materialized View peste tabelul de produse. Această vizualizare:

1. Aplatizează structurile JSONB adânci în text concatenat pentru a facilita căutarea full-text.  
2. Pre-calculează coloane virtuale pentru atributele promovate (ex: Brand, Categorie), permițând indexarea B-tree a acestora.9  
3. Include o coloană de embeddings (vector(1536) sau similar) care este actualizată asincron.

### **3.2. Strategia de Vectorizare și Chunking Semantic**

Transformarea Golden Record-ului într-un format înțeles de AI (vectori) este critică. O vectorizare naivă (a întregului text de produs) diluează informația.

Chunking Semantic:  
În loc să împărțim textul la număr fix de caractere, folosim structura logică a Golden Record-ului 15:

* **Chunk 1 (Identitate):** Titlu, SKU, Categorie, Preț. Acesta este vectorizat pentru a răspunde la întrebări de identificare ("Ce este produsul X?").  
* **Chunk 2 (Specificații):** Detaliile tehnice din JSONB. Vectorizat pentru întrebări funcționale ("Ce laptop are 32GB RAM?").  
* **Chunk 3 (Utilizare):** Descrierea de marketing și cazurile de utilizare. Vectorizat pentru întrebări de recomandare ("Ce îmi recomanzi pentru editare video?").

Fiecare chunk păstrează o referință (Foreign Key) către ID-ul produsului părinte, permițând agentului să recupereze întregul Golden Record indiferent care chunk a declanșat potrivirea.16

## **4\. Strategia de Căutare Hibridă: Motorul de Precizie**

Una dintre cauzele majore ale halucinațiilor în sistemele RAG simple este "alunecarea semantică" (semantic drift). Un utilizator care caută codul de eroare "503" poate primi rezultate despre "404" deoarece sunt semantic similare (ambele sunt erori), dar operațional distincte.17 În vânzări, dacă un client cere un produs cu "Diametru 50mm", un motor vectorial pur ar putea returna unul cu "52mm" ca fiind "similar", ceea ce este inacceptabil tehnic.

Pentru a rezolva această problemă, implementăm o arhitectură de **Hybrid Search** în PostgreSQL 18, care combină trei semnale distincte 7:

### **4.1. Componentele Căutării Hibride**

1. **Căutare Semantică (Dense Retrieval):**  
   * Utilizează pgvector pentru a calcula distanța Cosine între vectorul interogării utilizatorului și vectorii produselor.  
   * Rol: Înțelege *intenția* și *contextul* (ex: "ceva ieftin pentru școală").  
2. **Căutare Lexicală (Sparse Retrieval):**  
   * Utilizează tsvector și tsquery (PostgreSQL Full-Text Search) cu algoritmul BM25 (sau implementarea nativă ts\_rank\_cd).  
   * Rol: Identifică *cuvinte cheie exacte*, coduri de produs, numere de model sau specificații precise (ex: "RTX 4060", "bumbac 100%").17  
3. **Filtrare Structurată (SQL Filtering):**  
   * Aplică constrângeri hard (WHERE clauses) pe coloanele relaționale și JSONB.  
   * Rol: Elimină produsele care nu corespund criteriilor eliminatorii (ex: stock \> 0, price \< 5000).19

### **4.2. Algoritmul Reciprocal Rank Fusion (RRF)**

Pentru a combina rezultatele din căutarea semantică și cea lexicală, utilizăm RRF direct în interogarea SQL. RRF este o metodă robustă care nu necesită calibrarea complexă a scorurilor, deoarece lucrează cu ranguri, nu cu valori absolute.20

Formula RRF:

$$Score(d) \= \\sum\_{r \\in R} \\frac{1}{k \+ rank(d, r)}$$

Unde $d$ este documentul (produsul), $R$ este setul de clasamente (semantic și lexical), iar $k$ este o constantă de netezire (uzual 60).  
Implementarea SQL:  
Interogarea utilizează Common Table Expressions (CTE) pentru a executa cele două căutări în paralel, apoi face un FULL OUTER JOIN pe rezultate și calculează scorul RRF final.21 Această abordare rulează integral în baza de date, beneficiind de planificatorul de interogări optimizat al PG18.

### **4.3. Extragerea Filtrelor (Query Understanding)**

Înainte de a executa căutarea, input-ul utilizatorului trece printr-un proces de "Query Understanding" realizat de un model LLM mic și rapid (sau prin regex-uri avansate în Python).

* **Input:** "Vreau un laptop de gaming sub 5000 lei, neapărat cu 16GB RAM."  
* **Filtre Extrase:** { "category": "laptop", "tag": "gaming", "price\_max": 5000, "spec\_ram": "16GB" }.  
* **Acțiune:** Aceste filtre sunt aplicate ca clauze WHERE în SQL *înainte* de vector search (pre-filtering). Acest lucru asigură că niciun produs cu 8GB RAM sau preț de 6000 lei nu va fi considerat, indiferent de similaritatea semantică, eliminând o sursă majoră de halucinații.19

## **5\. Protocolul Contextului Modelului (MCP): Podul de Integrare**

Conectarea bazei de date la agentul AI s-a făcut istoric prin definiții ad-hoc de "function calling". În Etapa 3, adoptăm **Model Context Protocol (MCP)**, un standard deschis care standardizează modul în care asistenții AI interacționează cu datele locale și la distanță.23

### **5.1. De ce MCP și nu Function Calling Direct?**

Deși Function Calling este util, el creează o cuplare strânsă între prompt-ul sistemului și schema bazei de date. MCP decuplează aceste aspecte:

* **Abstractizare:** Serverul MCP expune "Resurse" (date) și "Unelte" (funcții) printr-un protocol standardizat. Clientul MCP (Agentul de Vânzări) se conectează la server și descoperă dinamic capabilitățile disponibile.26  
* **Portabilitate:** Un server MCP construit pentru PostgreSQL poate fi utilizat de orice client compatibil (Claude, OpenAI, IDE-uri) fără modificări de cod. Dacă schema Golden Records se schimbă, actualizăm doar serverul MCP, nu toți agenții.27  
* **Securitate:** MCP impune o barieră strictă. AI-ul nu execută SQL arbitrar; el poate cere resurse doar prin template-uri predefinite și read-only expuse de server.28

### **5.2. Implementarea Serverului MCP PostgreSQL (Python 3.14)**

Vom dezvolta un server MCP personalizat folosind SDK-ul mcp pentru Python.29 Acest server rulează ca un microserviciu alături de baza de date.

**Arhitectura Serverului MCP:**

1. **Resursa product://{sku}:** Permite AI-ului să citească direct și integral Golden Record-ul unui produs specific. Este utilizată atunci când AI-ul a identificat produsul și trebuie să ofere detalii specifice.  
2. **Unealta search\_products:** Expune funcționalitatea de Căutare Hibridă definită anterior. Acceptă argumente precum query, price\_min, price\_max, attributes.  
3. **Unealta check\_inventory:** O verificare în timp real (Real-Time Check) împotriva tabelei inventory\_items. Chiar dacă indexul vectorial are o latență de câteva secunde, această unealtă interoghează stocul tranzacțional exact înainte de a confirma disponibilitatea.

**Exemplu Conceptual de Implementare Python:**

Python

\# Exemplu simplificat al definiției serverului MCP  
from mcp.server.fastmcp import FastMCP

mcp \= FastMCP("Neanelu Sales Knowledge")

@mcp.tool()  
async def search\_products(query: str, filters: dict \= None) \-\> str:  
    """Execută o căutare hibridă pentru a găsi produse relevante."""  
    \# Logica de apelare a funcției SQL din PostgreSQL  
    \# Returnează un JSON cu produsele match-uite  
    pass

@mcp.tool()  
async def check\_realtime\_stock(sku: str) \-\> int:  
    """Verifică stocul fizic exact din ERP."""  
    \# Interogare directă pe tabela inventory\_items  
    pass

Această standardizare transformă baza de date dintr-un depozit inert într-un set de "abilități" pe care agentul le poate invoca.29

## **6\. Sincronizarea în Timp Real: Pipeline-ul CDC (Change Data Capture)**

Un risc major de halucinație este **latența datelor**. Dacă un produs iese din stoc la ora 14:00, dar indexul vectorial al AI-ului se actualizează doar noaptea, agentul va halucina disponibilitatea produsului timp de ore întregi. Soluția este un pipeline CDC bazat pe wal2json.31

### **6.1. Fluxul de Actualizare Instantanee**

1. **Sursa:** Orice operațiune INSERT, UPDATE sau DELETE pe tabelele din stratul Gold în PostgreSQL 18\.  
2. **Captura (WAL):** PostgreSQL scrie modificarea în Write-Ahead Log. Plugin-ul wal2json decodifică această intrare într-un obiect JSON care descrie schimbarea (ex: { "change": "update", "table": "products", "data": { "sku": "123", "price": 100 } }).  
3. **Ingestia:** Un serviciu Python 3.14 dedicat ascultă acest stream folosind mecanismul de replicare logică (sau un middleware de tip Debezium/Redpanda pentru scalabilitate).33  
4. **Sincronizarea Vectorială:**  
   * Dacă modificarea afectează atribute textuale (descriere, titlu), serviciul declanșează re-generarea embedding-ului prin API-ul OpenAI/Cohere și actualizează coloana vector în Postgres.  
   * Dacă modificarea este numerică (preț, stoc), datele sunt actualizate instantaneu în metadatele asociate vectorului.

Acest mecanism asigură că "memoria" AI-ului (vectorii) și "realitatea" (datele relaționale) sunt sincronizate cu o latență de ordinul secundelor, eliminând halucinațiile cauzate de date vechi ("stale data").

## **7\. Prevenirea Halucinațiilor: Strategia "Guardrails"**

Chiar și cu date perfecte, LLM-urile pot greși. Pentru a garanta siguranța, implementăm o strategie de "Defense in Depth" (Apărare în Adâncime) folosind framework-ul **Guardrails AI** și verificări deterministice.35

### **7.1. Stratul 1: Forțarea Structurii (Output Enforcement)**

Agentul de vânzări nu este lăsat să genereze text liber necontrolat. Output-ul său este constrâns la o schemă JSON strictă folosind Pydantic.

* În loc să cerem "Scrie un mesaj de vânzare", cerem: "Generează un obiect JSON cu cheile: greeting, proposed\_product\_sku, quoted\_price, reasoning".37  
* Această structurare permite validarea automată a fiecărui câmp înainte de a fi afișat utilizatorului.

### **7.2. Stratul 2: Bucla de Verificare (Generate \-\> Check \-\> Decide)**

Înainte ca orice mesaj să plece către client, acesta trece printr-un "Agent Verificator" (un script logic Python simplu și rapid).

* **Verificarea Prețului:** Verificatorul extrage prețul din JSON-ul generat de AI și îl compară cu prețul din Golden Record (via MCP get\_product\_details). Dacă $Preț\_{AI} \\neq Preț\_{DB}$, mesajul este blocat și regenerat.  
* **Verificarea Stocului:** Similar, se verifică dacă produsul recomandat are stock \> 0\. Dacă AI-ul recomandă un produs indisponibil, intervenția este oprită.2

### **7.3. Stratul 3: Garduri Semantice**

Utilizăm validatoarele din Guardrails AI Hub pentru a scana conținutul semantic:

* **Competitor Check:** Filtrează mențiunile despre branduri concurente care nu există în catalogul Neanelu.38  
* **Hallucination Detection:** Utilizează tehnici de "Self-Check" sau verificarea citărilor pentru a se asigura că afirmațiile făcute de AI sunt susținute de contextul recuperat din bază.39

## **8\. Generarea Ofertelor Precise: Stratul de Acțiune**

Ultimul pas în "Product Knowledge Integration" este capacitatea de a materializa discuția într-o ofertă concretă.

### **8.1. Generarea Dinamică a PDF-urilor**

Atunci când clientul este pregătit să cumpere, sistemul generează o ofertă PDF personalizată.

* **Tehnologie:** Utilizăm biblioteci Python performante precum **WeasyPrint** sau **ReportLab**.41 WeasyPrint este preferat deoarece permite definirea layout-ului în HTML/CSS, ceea ce este mai ușor de întreținut decât desenarea programatică în ReportLab.  
* **Flux:**  
  1. Agentul AI colectează datele necesare (SKU-uri, cantități, date client).  
  2. Aceste date sunt trimise către un serviciu de generare.  
  3. Serviciul populează un șablon Jinja2 cu datele din Golden Records (pentru a garanta acuratețea prețurilor și denumirilor).  
  4. WeasyPrint randează HTML-ul în PDF.  
  5. PDF-ul este încărcat temporar și un link securizat este trimis clientului pe WhatsApp.

## **9\. Integrarea cu Fluxul de Chat (Conexiunea cu Etapa 2\)**

Etapa 3 nu înlocuiește Etapa 2, ci se grefează pe ea.

* **Punctul de Handover:** Orchestratorul Node.js din Etapa 2 monitorizează starea lead-ului. Când un lead răspunde (WARM\_REPLY), orchestratorul oprește secvența de Cold Outreach și pasează controlul către Agentul AI (Etapa 3).  
* **Infrastructura Comună:** Agentul AI folosește aceleași cozi BullMQ și aceleași instanțe TimelinesAI pentru a trimite mesajele, asigurând continuitatea "identității" agentului (același număr de telefon).1  
* **Contextul Conversațional:** Istoricul conversației este încărcat din PostgreSQL și furnizat agentului AI ca context inițial, astfel încât acesta să știe ce s-a discutat în faza de outreach.

## **10\. Tabel Comparativ: Căutare Clasică vs. Hibridă Neanelu**

Pentru a evidenția avantajul strategiei alese:

| Caracteristică | Căutare Lexicală (Shopify/SQL LIKE) | Căutare Vectorială (Standard RAG) | Căutare Hibridă Neanelu (PG18 RRF) |
| :---- | :---- | :---- | :---- |
| **Interogare:** "Laptop ieftin" | Eșuează (nu există cuvântul "ieftin" în DB) | Găsește laptopuri cu preț mic (semantică) | **Găsește laptopuri cu preț mic** |
| **Interogare:** "Cod eroare 503" | Găsește exact 503 | Poate returna 404 sau 500 (similaritate) | **Găsește exact 503 (Lexical domină)** |
| **Interogare:** "RAM 32GB" | Găsește doar dacă scrie exact "RAM 32GB" | Poate returna 16GB (concept similar) | **Găsește exact 32GB (Filtru structurat)** |
| **Rezistență la Halucinații** | Medie (Poate returna 0 rezultate) | Scăzută (Poate inventa conexiuni) | **Maximă (Verificare încrucișată)** |
| **Latență** | Foarte Mică (\<10ms) | Medie (\~200ms) | **Mică (\<50ms cu indexare PG18)** |

## **11\. Concluzii și Recomandări Strategice**

Implementarea Etapei 3 transformă fundamental capacitatea de vânzare a platformei Neanelu. Prin adoptarea unei arhitecturi **Neuro-Simbolice**, sistemul nu doar "vorbește", ci "înțelege" și "verifică".

**Pilonii Succesului:**

1. **Adevărul Unic:** Centralizarea datelor în Golden Records pe PostgreSQL 18 elimină ambiguitatea.  
2. **Integrarea Standardizată:** Protocolul MCP asigură că AI-ul are un mod sigur și controlat de a accesa aceste date.  
3. **Verificarea Deterministă:** Guardrails-urile bazate pe logică hard (preț/stoc) acționează ca o plasă de siguranță impenetrabilă împotriva halucinațiilor.  
4. **Viteza de Reacție:** Stiva Node.js/Python 3.14/CDC asigură că agentul operează întotdeauna pe date proaspete ("fresh data").

Recomandare de Acțiune Imediată:  
Prioritatea zero este implementarea Pipeline-ului CDC și a Serverului MCP. Fără acestea, agentul AI este doar un chatbot generic. Odată ce aceste fundații sunt solide, se poate activa gradual logica de generare a răspunsurilor, inițial în mod "Shadow" (fără trimitere), pentru a valida acuratețea pe date reale înainte de lansarea publică ("Live Activation").10 Această abordare etapizată minimizează riscul și maximizează învățarea organizațională.

#### **Lucrări citate**

1. Etapa 2 \- Optimizare Strategie Cold Outreach Multi-Canal  
2. AI Agent Guardrails: Production Guide for 2026 \- Authority Partners, accesată pe ianuarie 6, 2026, [https://authoritypartners.com/insights/ai-agent-guardrails-production-guide-for-2026/](https://authoritypartners.com/insights/ai-agent-guardrails-production-guide-for-2026/)  
3. Preventing AI Hallucinations in Customer Support \- Siena AI, accesată pe ianuarie 6, 2026, [https://www.siena.cx/blog/preventing-ai-hallucinations-in-customer-support-a-practical-approach](https://www.siena.cx/blog/preventing-ai-hallucinations-in-customer-support-a-practical-approach)  
4. Etapa 1 \- Strategie Data Enrichment Prospecti Romania  
5. Tehnologii Active Ianuarie 2026  
6. PostgreSQL 18 just dropped: 10 powerful new features devs need to know, accesată pe ianuarie 6, 2026, [https://dev.to/dev\_tips/postgresql-18-just-dropped-10-powerful-new-features-devs-need-to-know-3jf](https://dev.to/dev_tips/postgresql-18-just-dropped-10-powerful-new-features-devs-need-to-know-3jf)  
7. pgvector Hybrid Search: Benefits, Use Cases & Quick Tutorial, accesată pe ianuarie 6, 2026, [https://www.instaclustr.com/education/vector-database/pgvector-hybrid-search-benefits-use-cases-and-quick-tutorial/](https://www.instaclustr.com/education/vector-database/pgvector-hybrid-search-benefits-use-cases-and-quick-tutorial/)  
8. Building AI-Powered Search and RAG with PostgreSQL and Vector Embeddings \- Medium, accesată pe ianuarie 6, 2026, [https://medium.com/@richardhightower/building-ai-powered-search-and-rag-with-postgresql-and-vector-embeddings-09af314dc2ff](https://medium.com/@richardhightower/building-ai-powered-search-and-rag-with-postgresql-and-vector-embeddings-09af314dc2ff)  
9. pgvector/pgvector: Open-source vector similarity search for Postgres \- GitHub, accesată pe ianuarie 6, 2026, [https://github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)  
10. 1\_Neanelu\_Shopify  
11. Documentation: 18: 9.16. JSON Functions and Operators \- PostgreSQL, accesată pe ianuarie 6, 2026, [https://www.postgresql.org/docs/current/functions-json.html](https://www.postgresql.org/docs/current/functions-json.html)  
12. PostgreSQL as a JSON database: Advanced patterns and best practices \- AWS, accesată pe ianuarie 6, 2026, [https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/](https://aws.amazon.com/blogs/database/postgresql-as-a-json-database-advanced-patterns-and-best-practices/)  
13. Python-powered AI agents are here \- Azalio, accesată pe ianuarie 6, 2026, [https://www.azalio.io/python-powered-ai-agents-are-here/](https://www.azalio.io/python-powered-ai-agents-are-here/)  
14. Compatibility and requirements for the Python agent | New Relic Documentation, accesată pe ianuarie 6, 2026, [https://docs.newrelic.com/docs/apm/agents/python-agent/getting-started/compatibility-requirements-python-agent/](https://docs.newrelic.com/docs/apm/agents/python-agent/getting-started/compatibility-requirements-python-agent/)  
15. 8 Ways to Prevent LLM Hallucinations \- Airbyte, accesată pe ianuarie 6, 2026, [https://airbyte.com/agentic-data/prevent-llm-hallucinations](https://airbyte.com/agentic-data/prevent-llm-hallucinations)  
16. Stop Hallucinations at the Source: Hybrid RAG That Checks Itself | HackerNoon, accesată pe ianuarie 6, 2026, [https://hackernoon.com/stop-hallucinations-at-the-source-hybrid-rag-that-checks-itself](https://hackernoon.com/stop-hallucinations-at-the-source-hybrid-rag-that-checks-itself)  
17. I implemented Hybrid Search (BM25 \+ pgvector) in Postgres to fix RAG retrieval for exact keywords. Here is the logic. \- Reddit, accesată pe ianuarie 6, 2026, [https://www.reddit.com/r/Rag/comments/1pcvtan/i\_implemented\_hybrid\_search\_bm25\_pgvector\_in/](https://www.reddit.com/r/Rag/comments/1pcvtan/i_implemented_hybrid_search_bm25_pgvector_in/)  
18. PostgreSQL Hybrid Search Using pgvector and Cohere \- Tiger Data, accesată pe ianuarie 6, 2026, [https://www.tigerdata.com/learn/postgresql-hybrid-search-using-pgvector-and-cohere](https://www.tigerdata.com/learn/postgresql-hybrid-search-using-pgvector-and-cohere)  
19. RAG with Function Calling & Hybrid Search on PostgreSQL Locally with Ollama \- Medium, accesată pe ianuarie 6, 2026, [https://medium.com/@manoranjan.rajguru/rag-with-function-calling-hybrid-search-on-postgresql-locally-with-ollama-c8019900fb54](https://medium.com/@manoranjan.rajguru/rag-with-function-calling-hybrid-search-on-postgresql-locally-with-ollama-c8019900fb54)  
20. Hybrid Search in PostgreSQL: The Missing Manual \- ParadeDB, accesată pe ianuarie 6, 2026, [https://www.paradedb.com/blog/hybrid-search-in-postgresql-the-missing-manual](https://www.paradedb.com/blog/hybrid-search-in-postgresql-the-missing-manual)  
21. Postgres as a vector Database | Implementing Hybrid search with Postgres for RAG Using Groq. | by Meeran Malik | Medium, accesată pe ianuarie 6, 2026, [https://medium.com/@meeran03/postgres-as-a-vector-database-implementing-hybrid-search-with-postgres-for-rag-using-groq-494ca3e41d57](https://medium.com/@meeran03/postgres-as-a-vector-database-implementing-hybrid-search-with-postgres-for-rag-using-groq-494ca3e41d57)  
22. Run a hybrid vector similarity search | AlloyDB for PostgreSQL, accesată pe ianuarie 6, 2026, [https://docs.cloud.google.com/alloydb/docs/ai/run-hybrid-vector-similarity-search](https://docs.cloud.google.com/alloydb/docs/ai/run-hybrid-vector-similarity-search)  
23. Building MCP servers for ChatGPT and API integrations \- OpenAI Platform, accesată pe ianuarie 6, 2026, [https://platform.openai.com/docs/mcp](https://platform.openai.com/docs/mcp)  
24. Introducing the Model Context Protocol \- Anthropic, accesată pe ianuarie 6, 2026, [https://www.anthropic.com/news/model-context-protocol](https://www.anthropic.com/news/model-context-protocol)  
25. What is the Model Context Protocol (MCP)? Complete Guide to MCP Architecture, Servers, Clients & AI Integration, accesată pe ianuarie 6, 2026, [https://vishalbulbule.medium.com/what-is-the-model-context-protocol-mcp-59422d88ed85](https://vishalbulbule.medium.com/what-is-the-model-context-protocol-mcp-59422d88ed85)  
26. MCP (Model Context Protocol): The Missing Layer in AI Tool Integration | by Partha Das | Jan, 2026, accesată pe ianuarie 6, 2026, [https://medium.com/@apartha77/mcp-model-context-protocol-the-missing-layer-in-ai-tool-integration-8d764119f23a](https://medium.com/@apartha77/mcp-model-context-protocol-the-missing-layer-in-ai-tool-integration-8d764119f23a)  
27. MCP vs Tool Calling — The Missing Standard AI Developers Were Begging For, accesată pe ianuarie 6, 2026, [https://medium.com/@ashishpandey2062/mcp-vs-tool-calling-the-missing-standard-ai-developers-were-begging-for-c45b9273003c](https://medium.com/@ashishpandey2062/mcp-vs-tool-calling-the-missing-standard-ai-developers-were-begging-for-c45b9273003c)  
28. How to Setup and Use PostgreSQL MCP Server | by Rowan Blackwoon | Medium, accesată pe ianuarie 6, 2026, [https://rowanblackwoon.medium.com/how-to-setup-and-use-postgresql-mcp-server-82fc3915e5c1](https://rowanblackwoon.medium.com/how-to-setup-and-use-postgresql-mcp-server-82fc3915e5c1)  
29. The official Python SDK for Model Context Protocol servers and clients \- GitHub, accesată pe ianuarie 6, 2026, [https://github.com/modelcontextprotocol/python-sdk](https://github.com/modelcontextprotocol/python-sdk)  
30. Simple PostgreSQL MCP Server \- LobeHub, accesată pe ianuarie 6, 2026, [https://lobehub.com/mcp/netanelbollag-simple-psql-mcp](https://lobehub.com/mcp/netanelbollag-simple-psql-mcp)  
31. Documentation: 18: 32.9. Asynchronous Notification \- PostgreSQL, accesată pe ianuarie 6, 2026, [https://www.postgresql.org/docs/current/libpq-notify.html](https://www.postgresql.org/docs/current/libpq-notify.html)  
32. Streaming PostgreSQL changes as JSON with wal2json \- OpenSource DB, accesată pe ianuarie 6, 2026, [https://opensource-db.com/streaming-postgresql-changes-as-json-with-wal2json/](https://opensource-db.com/streaming-postgresql-changes-as-json-with-wal2json/)  
33. How do you Postgres CDC into vector database : r/dataengineering \- Reddit, accesată pe ianuarie 6, 2026, [https://www.reddit.com/r/dataengineering/comments/1p1ek48/how\_do\_you\_postgres\_cdc\_into\_vector\_database/](https://www.reddit.com/r/dataengineering/comments/1p1ek48/how_do_you_postgres_cdc_into_vector_database/)  
34. Stream changes from a PostgreSQL Database to a Vector Store \- AI Advances, accesată pe ianuarie 6, 2026, [https://ai.gopubby.com/stream-changes-from-a-postgresql-database-to-a-vector-store-83df7adc0bfa](https://ai.gopubby.com/stream-changes-from-a-postgresql-database-to-a-vector-store-83df7adc0bfa)  
35. Adding guardrails to large language models. \- GitHub, accesată pe ianuarie 6, 2026, [https://github.com/guardrails-ai/guardrails](https://github.com/guardrails-ai/guardrails)  
36. Guardrails 101: Preventing AI Hallucinations in Sales Engagement, accesată pe ianuarie 6, 2026, [https://www.jeeva.ai/blog/guardrails-preventing-ai-hallucinations-sales-engagement](https://www.jeeva.ai/blog/guardrails-preventing-ai-hallucinations-sales-engagement)  
37. Generate Structured Data | Your Enterprise AI needs Guardrails, accesată pe ianuarie 6, 2026, [https://www.guardrailsai.com/docs/how\_to\_guides/generate\_structured\_data](https://www.guardrailsai.com/docs/how_to_guides/generate_structured_data)  
38. Guardrails Hub, accesată pe ianuarie 6, 2026, [https://guardrailsai.com/hub](https://guardrailsai.com/hub)  
39. AI Hallucinations: Why They Occur and How to Prevent Damage \- NineTwoThree, accesată pe ianuarie 6, 2026, [https://www.ninetwothree.co/blog/ai-hallucinations](https://www.ninetwothree.co/blog/ai-hallucinations)  
40. Hallucination Detection \- OpenAI Guardrails Python, accesată pe ianuarie 6, 2026, [https://openai.github.io/openai-guardrails-python/ref/checks/hallucination\_detection/](https://openai.github.io/openai-guardrails-python/ref/checks/hallucination_detection/)  
41. Top 10 Python PDF generator libraries: Complete guide for developers (2025) \- Nutrient iOS, accesată pe ianuarie 6, 2026, [https://www.nutrient.io/blog/top-10-ways-to-generate-pdfs-in-python/](https://www.nutrient.io/blog/top-10-ways-to-generate-pdfs-in-python/)  
42. Generate good looking PDFs with WeasyPrint and Jinja2 \- Josh Karamuth, accesată pe ianuarie 6, 2026, [https://joshkaramuth.com/blog/generate-good-looking-pdfs-weasyprint-jinja2/](https://joshkaramuth.com/blog/generate-good-looking-pdfs-weasyprint-jinja2/)