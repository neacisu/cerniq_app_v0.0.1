# Arhitectură Tehnică și Strategie de Implementare "Vertical Slice" pentru Aplicații de Automatizare Vânzări (Ediția 2026)

## 1. Paradigma Arhitecturală pentru Echipa de Un Singur Om în Era AI

În peisajul dezvoltării software din 2026, conceptul de "echipă de un singur om" (1-person-team) a suferit o transformare radicală. Nu mai este vorba despre un dezvoltator "Full Stack" tradițional care jonglează precar între frontend și backend, ci despre un "Arhitect Augmentat de AI". Utilizarea instrumentelor precum Cursor și Copilot a schimbat fundamental unitatea de bază a livrabilelor software. Într-o arhitectură tradițională stratificată (Layered Architecture), dezvoltarea este orizontală: se proiectează întreaga bază de date, apoi întregul strat de acces la date, urmat de logica de business și, în final, interfața utilizator. Această abordare, deși robustă pentru echipe mari specializate, este fatală pentru un solopreneur. Ea induce o încărcare cognitivă masivă, necesitând menținerea în memorie a întregului sistem pentru a implementa o singură funcționalitate, și întârzie feedback-ul vizual și funcțional până în etapele finale ale ciclului de dezvoltare.

Pentru a maximiza eficiența unui singur dezvoltator asistat de AI, acest raport propune adoptarea radicală a arhitecturii "Vertical Slice". Această paradigmă restructurează aplicația nu pe straturi tehnice (Controllers, Models, Views), ci pe funcționalități de business (ex: "Înregistrare Lead", "Trimitere Campanie Email", "Sincronizare Calendar"). Fiecare "felie" verticală conține tot codul necesar pentru acea funcționalitate: schema bazei de date, rutele API, logica de validare, interfața utilizator și testele aferente. Această organizare spațială a codului este crucială pentru instrumentele de AI generativ. Cursor, de exemplu, funcționează optim atunci când contextul relevant (fișierele interdependente) este colocat. Atunci când AI-ul primește ca input un director features/create-lead care conține atât componenta React, cât și handler-ul Fastify și schema Drizzle, rata de halucinație scade, iar calitatea codului generat crește exponențial, deoarece dependențele sunt explicite și locale.1

Alegerea stivei tehnologice "Bleeding Edge 2026" — Node.js 22, Fastify v5, Python 3.13, React 19 și Refine — nu este un exercițiu de vanitate tehnologică, ci o decizie strategică de reducere a codului de infrastructură (boilerplate) și de creștere a performanței native. Node.js 22 cu suportul nativ pentru TypeScript (experimental) și --watch, împreună cu Python 3.13 care elimină GIL-ul (Global Interpreter Lock), permit o densitate de calcul pe o singură mașină care anterior ar fi necesitat clustere complexe. Această densitate este esențială pentru a menține costurile operaționale scăzute și arhitectura simplă ("monolit modular") pentru o singură persoană.

Implementarea acestui sistem va urmări un roadmap strict, unde fiecare fază livrează o capacitate operațională completă. Nu vom construi "un backend", ci vom construi "capacitatea de a gestiona lead-uri". Această distincție subtilă asigură că la finalul fiecărui sprint (sau sesiune de lucru cu AI), sistemul este într-o stare stabilă, testabilă și, cel mai important, utilizabilă. Această abordare psihologică menține momentum-ul proiectului și permite ajustarea rapidă a direcției produsului pe baza interacțiunii reale cu funcționalitățile finalizate.

## 2. Fundamentul Tehnologic: Node.js 22, Fastify v5 și Python 3.13

Nucleul infrastructurii backend este hibrid, exploatând punctele forte specifice ale ecosistemelor Node.js și Python într-o simbioză orchestrată prin Docker. Această secțiune analizează în profunzime configurația și implicațiile utilizării celor mai noi versiuni ale acestor runtime-uri.

### 2.1. Node.js 22 LTS și Evoluția Fastify v5

Versiunea **Node.js 22 (nume de cod "Jod")** reprezintă platforma de execuție pentru API-ul principal. Aceasta aduce optimizări critice ale motorului V8 (v12.4), incluzând "Maglev" (un compilator JIT intermediar) care reduce semnificativ timpul de pornire și latența cererilor HTTP scurte, tipice pentru microservicii și API-uri REST.6 Pentru un dezvoltator independent, caracteristica --watch nativă din Node 22 este revoluționară. Eliminând necesitatea unor unelte externe precum nodemon sau ts-node-dev, simplificăm lanțul de dependențe și reducem conflictele de compatibilitate în containerele Docker. Configurația package.json devine mai curată, iar procesul de hot-reloading este gestionat direct de runtime, fiind mult mai robust la erorile de sistem de fișiere care apăreau frecvent în Docker pe Windows sau macOS.

Fastify v5 este framework-ul ales pentru viteza sa extremă și arhitectura bazată pe plugin-uri, care se aliniază natural cu structura Vertical Slice. Migrarea la v5 aduce o schimbare de paradigmă prin impunerea strictă a schemelor JSON complete și eliminarea suportului pentru "shorthand" în definirea rutelor. Deși aparent o creștere a verbozității, această cerință este un avantaj major în era AI. Schemele explicite și detaliate servesc drept documentație perfectă pentru Cursor/Copilot, permițându-le să deducă logica de business și să genereze teste precise.

> **Arhitectura Type-Provider și Validarea**

Punctul forte al Fastify v5 în 2026 este integrarea nativă a conceptului de Type Provider. În loc să definim manual interfețe TypeScript pentru Request și Reply, care riscă să se desincronizeze de logica de validare, Fastify v5 permite utilizarea bibliotecilor precum type-provider-typebox sau fastify-type-provider-zod. Aceasta creează o "sursă unică de adevăr": schema de validare Zod. Din această schemă, Fastify compilează automat validatoare performante (folosind ajv sub capotă) și, simultan, TypeScript inferă tipurile statice pentru intellisense.

Într-un sistem Vertical Slice, acest lucru elimină necesitatea unui director global /types. Tipurile sunt colocate cu rutele.

```TypeScript

// features/leads/create-lead.ts
import { z } from 'zod';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const CreateLeadSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  companySize: z.enum(['1-10', '11-50', '50+'])
});

export const createLeadRoute: FastifyPluginAsyncZod = async (app) => {
  app.post('/leads', {
    schema: { body: CreateLeadSchema }, // Fastify v5 enforcează structura
  }, async (req, reply) => {
    // req.body este strict tipizat aici.
    // Accesarea req.body.phone va genera eroare TS instantanee.
    const { email } = req.body;
    return { id: 'new-id', status: 'created' };
  });
};
```

Această abordare reduce drastic bug-urile de tip "undefined is not a function" și permite AI-ului să scrie cod de client (frontend) extrem de precis, deoarece contractul API este garantat de sistemul de tipuri.

### 2.2. Python 3.13 și Eliminarea GIL (Global Interpreter Lock)

Componenta de procesare a datelor și inteligență artificială (worker-ul) este construită pe Python 3.13. Cea mai semnificativă inovație din această versiune este introducerea modului experimental "free-threaded", care permite dezactivarea GIL-ului. Istoric, GIL-ul a limitat firele de execuție Python la rularea pe un singur nucleu CPU la un moment dat, ceea ce făcea multithreading-ul ineficient pentru sarcini CPU-bound (cum ar fi procesarea textului, analiza datelor sau inferența modelelor AI locale).

Pentru aplicația noastră de vânzări, acest lucru are implicații profunde. Un singur container Docker care rulează Python 3.13 poate acum să gestioneze eficient sarcini paralele masive — cum ar fi personalizarea simultană a 50 de emailuri folosind un model LLM local sau procesarea a zeci de fluxuri audio pentru agenții vocali — folosind thread-uri native, mult mai ușoare decât procesele separate (multiprocessing). Aceasta reduce amprenta de memorie a aplicației (crucial pentru un server self-hosted) și simplifică arhitectura worker-ului, eliminând complexitatea comunicării inter-proces.

### 2.3. Orchestrarea Containerelor și Docker Compose Watch

Integrarea acestor două medii (Node și Python) se face prin Docker Compose. Noutatea pentru 2026 este utilizarea extinsă a docker compose watch. Spre deosebire de vechea metodă de montare a volumelor (-v.:/app), care suferea de latențe mari pe sistemele de fișiere non-Linux (Windows/Mac) și probleme de permisiuni, watch sincronizează activ fișierele modificate.

Configurația optimă pentru această arhitectură Vertical Slice implică definirea regulilor de sincronizare granulare:

- Sync: Pentru codul sursă (JS/TS/PY), modificările sunt copiate instantaneu în container.
- Rebuild: Pentru package.json sau requirements.txt, modificarea declanșează automat reconstruirea imaginii, asigurând că noile dependențe sunt mereu prezente fără intervenție manuală.

Această arhitectură oferă dezvoltatorului experiența fluidă a dezvoltării locale ("it just works") combinată cu certitudinea mediului de producție izolat.

## 3. Frontend Modern: React 19 și Refine în Arhitectură Headless

Interfața utilizator (UI) este punctul de contact critic pentru o aplicație de vânzări, unde viteza și reactivitatea dictează productivitatea utilizatorului. Combinația dintre React 19 și Refine transformă modul în care gestionăm starea și datele.

### 3.1. React 19: Actions și Optimistic UI

React 19 introduce primitive stabile pentru gestionarea asincronicității care simplifică drastic codul de frontend. "Server Actions" (adaptate în contextul SPA prin framework-uri precum Refine) și hook-ul useOptimistic permit implementarea unor interfețe care răspund instantaneu la interacțiunea utilizatorului, chiar înainte ca serverul să confirme operațiunea. Într-un CRM, când un utilizator mută un lead din coloana "Nou" în "Contactat", interfața trebuie să reflecte schimbarea imediat. Codul necesar pentru această logică "optimistică" este redus semnificativ în React 19, eliminând boilerplate-ul complex de gestionare manuală a stării de "pending" și "rollback".

### 3.2. Refine: Framework-ul Meta pentru Aplicații Enterprise

Refine funcționează ca un strat intermediar între React și logica de business, standardizând operațiunile CRUD. Într-o abordare Vertical Slice, Refine strălucește prin arhitectura sa "headless". Spre deosebire de framework-urile admin clasice care impun o bibliotecă UI specifică, Refine decuplează logica (hooks) de prezentare. Acest lucru permite utilizarea Tailwind CSS v4 pentru styling, asigurând o performanță grafică maximă (datorită noului motor Tailwind scris în Rust) și un design complet personalizat, esențial pentru un produs care dorește să se diferențieze.

> **Integrarea Refine cu Fastify v5 (Custom Data Provider)**

O provocare specifică acestei stive tehnologice este incompatibilitatea implicită dintre modul în care Refine serializează parametrii de filtrare în URL și modul în care Fastify v5, cu validarea sa strictă, așteaptă datele. Refine generează query string-uri complexe de tipul filters[field]=status&filters[operator]=eq. Fastify v5, implicit, poate respinge aceste structuri dacă schema nu este definită să accepte obiecte imbricate în query string sau dacă parserul implicit nu este configurat corespunzător.

Soluția necesită implementarea unui Custom Data Provider în Refine și a unui plugin de parsare în Fastify.

- **Refine Side**: Data provider-ul trebuie să normalizeze cererile. De exemplu, în loc să trimită obiecte imbricate complexe, poate serializa filtrele într-un singur parametru JSON stringificat (?q={...}) sau poate utiliza formatul standard qs pe care Fastify îl poate parsa dacă este configurat cu qs ca parser de query string.
- **Fastify Side**: Configurarea unui parser custom (querystringParser) care utilizează biblioteca qs pentru a suporta adâncimea imbricată generată de Refine. Mai mult, schema Zod din Fastify trebuie să reflecte această structură dinamică, utilizând z.record() sau tipuri recursive pentru a valida structurile de filtrare arbitrare permise de Refine.

| Funcționalitate Refine       | Fastify v5 Requirement                    | Soluție de Implementare                                          |
| ---------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Filtrare (filters[...])      | Schema strictă (no additional properties) | Definire schemă Zod z.array(z.object({ field: z.string(),... })) |
| Sortare (sorters[...])       | Validare tipuri query params              | Parser custom qs în Fastify + Validare Zod                       |
| Paginare (current, pageSize) | Coerciție tipuri (string -> number)       | Utilizare z.coerce.number() în schema de validare                |

Această adaptare asigură că flexibilitatea Refine nu compromite securitatea și rigoarea Fastify v5.

## 4. Faza 1: Vertical Slice - Fundația și Autentificarea (Săptămânile 1-2)

Primul "slice" vertical nu este doar infrastructura, ci o funcționalitate completă de autentificare și gestionare a profilului utilizatorului, securizată și gata de producție.

### 4.1. Configurare Monorepo și Structura Codului

Pentru a evita complexitatea gestionării pachetelor multiple, dar păstrând separarea logică, se va utiliza un monorepo gestionat prin pnpm workspaces. Structura de directoare reflectă arhitectura Vertical Slice, grupând fișierele după funcționalitate, nu după tip.
Structura de directoare propusă:

```text

/root
├── apps
│   ├── api (Fastify v5)
│   │   ├── src
│   │   │   └── features
│   │   │       └── auth <-- Vertical Slice Complet
│   │   │           ├── index.ts (Plugin definition)
│   │   │           ├── routes.ts (API Endpoints)
│   │   │           ├── schema.ts (Zod Schemas shared with frontend via types export)
│   │   │           └── service.ts (Business Logic)
│   └── web (Refine + React 19)
│       └── src
│           └── features
│               └── auth
│                   ├── pages/LoginPage.tsx
│                   ├── components/LoginForm.tsx
│                   └── hooks/useAuth.ts
├── packages
│   ├── db (Drizzle ORM)
│   │   ├── schema/users.ts
│   │   └── migrations
│   └── shared-types (Exported Types from Zod)
├── docker-compose.yml
└── .cursorrules
```

Configurarea **.cursorrules**:

Fișierul .cursorrules este esențial pentru a menține consistența codului generat de AI. Acesta trebuie să conțină instrucțiuni explicite despre arhitectură.

- Regula 1 (Context): "Ești un expert în Fastify v5 și React 19. Folosește întotdeauna fastify-type-provider-zod. Nu genera fișiere Controller sau Model separate; folosește colocarea în directoare features."
- Regula 2 (Validare): "Toate rutele API trebuie să aibă o schemă Zod definită. Nu folosi any."
- Regula 3 (Refine): "Când generezi cod Refine, folosește hook-urile native (useForm, useTable) și integrează-le cu useOptimistic din React 19 unde este posibil."

### 4.2. Implementarea Autentificării Securizate

Securitatea într-o aplicație modernă necesită o abordare "secure by default".

- **Backend**: Implementarea autentificării folosind @fastify/jwt și @fastify/cookie. Token-urile JWT (Access Token) vor fi stocate exclusiv în cookie-uri HttpOnly, Secure și SameSite=Strict. Acest lucru previne furtul token-urilor prin atacuri XSS (Cross-Site Scripting), deoarece JavaScript-ul din browser nu poate accesa aceste cookie-uri.29
- **Refresh Token Rotation**: Pentru a menține sesiunea activă în siguranță, se implementează un mecanism de rotire a token-urilor de refresh. La fiecare reîmprospătare a accesului, vechiul refresh token este invalidat și înlocuit, limitând fereastra de oportunitate în cazul compromiterii.32
- **Refine AuthProvider**: Provider-ul de autentificare din Refine va fi configurat să nu gestioneze token-uri explicite. Metodele login, check și logout vor face apeluri către API, bazându-se pe mecanismul automat al browserului de a trimite cookie-urile HttpOnly. Răspunsurile API vor dicta starea de autentificare (ex: 200 OK sau 401 Unauthorized).

## 5. Faza 2: Vertical Slice - Motorul de Gestionare Lead-uri (Săptămânile 3-4)

Acest modul reprezintă nucleul funcțional al CRM-ului, demonstrând puterea integrării Drizzle ORM cu Fastify și Refine.

### 5.1. Modelarea Datelor cu Drizzle ORM

Drizzle ORM oferă avantajul major al performanței și al tipizării stricte fără overhead-ul de runtime al ORM-urilor clasice.

- **Schema**: Definirea tabelelor leads, pipelines, activities. Drizzle permite definirea relațiilor și constrângerilor SQL direct în TypeScript.
- **Zod Integration**: Utilizarea drizzle-zod pentru a genera automat scheme de validare Zod din definițiile tabelelor. Aceasta asigură că validarea API-ului este mereu sincronizată cu structura bazei de date. Dacă adăugăm o coloană în DB, schema de validare API se actualizează automat prin inferență, reducând riscul de erori.

### 5.2. Backend: Filtrare și Paginare Dinamică

Refine trimite cereri de listare complexe. Pentru a răspunde eficient, backend-ul trebuie să construiască interogări SQL dinamice.

- **Pattern-ul Dynamic Query**: Utilizarea funcției $dynamic() din Drizzle. Aceasta permite construirea condiționată a interogărilor (ex: adăugarea unei clauze WHERE doar dacă un filtru este prezent) fără a compromite siguranța tipurilor.
- **Implementare**: Se va crea un utilitar generic parseRefineFilters care mapează operatorii Refine (eq, contains, gte) la operatorii SQL Drizzle (eq, ilike, gte). Acest utilitar va fi reutilizat în toate modulele viitoare.

### 5.3. Frontend: Experiența Utilizator în Timp Real

Interfața de gestionare a lead-urilor va folosi useTable din Refine pentru a gestiona starea tabelului (paginare, sortare, filtre) sincronizată cu URL-ul browserului.

- **Formulare Optimiste**: La crearea sau editarea unui lead, useForm din Refine, combinat cu conceptele React 19, va actualiza cache-ul local (via TanStack Query v5, pe care Refine îl folosește intern) instantaneu. Utilizatorul vede lead-ul "salvat" imediat, eliminând percepția de latență a rețelei.

## 6. Faza 3: Vertical Slice - Motorul de Cold Outreach și Workerii Python (Săptămânile 5-6)

Această fază introduce complexitatea procesării asincrone și a integrării serviciilor externe, esențială pentru automatizarea vânzărilor.

### 6.1. Infrastructura de Email: Resend vs AWS SES

Analiza comparativă a soluțiilor de email relevă un compromis clar între cost și ușurința utilizării (Developer Experience - DX).

- **AWS SES**: Este liderul absolut în costuri ($0.10 pentru 1000 de emailuri), dar vine cu o politică de toleranță zero la spam (rata de reclamații sub 0.1%) și o configurare inițială complexă (Sandbox mode, cerere de creștere a limitelor, configurare manuală a reputației).
- **Resend**: Construit peste AWS SES, oferă o experiență de dezvoltare superioară, cu SDK-uri moderne, template-uri React Email și un dashboard excelent pentru debugging. Deși mai scump ($20/lună pentru un volum de start), timpul economisit în configurare și debugging este vital pentru o echipă de un singur om.
- **Strategia Hibridă**: Se va implementa un strat de abstractizare EmailService. Inițial, se va folosi Resend pentru viteza de implementare și livrare garantată. Pe măsură ce volumul crește și costurile devin semnificative, se poate schimba implementarea din spatele EmailService către AWS SES direct, fără a modifica logica de business a aplicației.

### 6.2. Workerii Python No-GIL și Cozile de Mesaje

Procesarea campaniilor de email (trimitere, tracking, procesare răspunsuri) este delegată workerilor Python.

- **Arhitectura**: Fastify plasează job-uri într-o coadă Redis (folosind bullmq). Workerul Python consumă aceste job-uri.
- **Avantajul Python 3.13**: Într-o campanie de outreach, personalizarea mesajelor poate implica utilizarea unui LLM local mic (pentru a genera introduceri personalizate). Dezactivarea GIL în Python 3.13 permite workerului să ruleze aceste inferențe (CPU-bound) pe thread-uri paralele reale, maximizând utilizarea CPU-ului fără a bloca procesarea I/O a trimiterii emailurilor. Aceasta elimină necesitatea de a rula multiple instanțe de containere Python, reducând consumul de memorie RAM al serverului.5
- **Rate Limiting & Safety**: Workerul va implementa un mecanism strict de "leaky bucket" pentru a nu depăși limitele de trimitere ale providerului de email și pentru a proteja reputația domeniului ("Warm-up" automatizat), o cerință critică identificată în materialele de cercetare.

## 7. Faza 4: Vertical Slice - Agentul Vocal AI (Săptămânile 7-8)

Aceasta este componenta cea mai inovatoare, transformând aplicația dintr-un CRM pasiv într-un agent activ de vânzări.

### 7.1. Stack-ul Real-time: Pipecat vs LiveKit

Pentru implementarea agenților vocali, există două opțiuni majore open-source: LiveKit și Pipecat.

- **LiveKit**: Este o infrastructură robustă, scrisă în Go/Rust, cu SDK-uri excelente. Este standardul industriei pentru WebRTC scalabil.
- **Pipecat**: Este un framework Python-first, conceput specific pentru orchestrarea fluxurilor AI multimodale. Având în vedere că deja folosim Python 3.13 în stack-ul nostru de workeri, Pipecat este alegerea naturală. Permite definirea fluxului conversațional direct în Python, integrându-se nativ cu bibliotecile de LLM și TTS (Text-to-Speech).

### 7.2. Arhitectura Hibridă pentru Latență Minimă

Latența este inamicul conversației naturale. O latență de peste 500ms face conversația să pară robotică.
Pipeline:

- **Transport: WebRTC via Pipecat.**
  1. **VAD (Voice Activity Detection):** Rulare locală folosind Silero VAD (foarte rapid, CPU-efficient) pentru a detecta când utilizatorul vorbește și a întrerupe AI-ul (barge-in).47
  2. **STT (Speech-to-Text):** Utilizarea serviciului Deepgram (via API) pentru viteză extremă (<300ms) sau Whisper distil-large-v3 rulat local pe GPU dacă hardware-ul permite.
  3. **LLM:** Groq (Llama 3 8B) oferă o viteză de inferență imbatabilă pentru un cost minim, esențială pentru a menține latența totală sub control. Alternativ, pentru confidențialitate totală, un model Ollama (ex: Qwen 2.5) rulat local în containerul Python, profitând de No-GIL pentru performanță.49
  4. **TTS (Text-to-Speech):** ElevenLabs (calitate premium) sau modele locale precum Kokoro (rapid și gratuit).

Această configurație "Vertical Slice" permite aplicației să inițieze apeluri telefonice (prin integrare Twilio/SIP trunchiată în Pipecat) și să califice lead-urile autonom.

## 8. Faza 5: Observabilitate și DevOps (Continuu)

Pentru o echipă de un singur om, capacitatea de a diagnostica rapid problemele este mai importantă decât perfecțiunea uptime-ului.

### 8.1. Docker Compose Watch și DX

Configurarea docker-compose.yml va utiliza extensiv secțiunea x-develop și watch.

- **Pentru serviciul API (Node):** Acțiunea sync va monitoriza fișierele .ts. La detectarea unei modificări, fișierul este injectat în container, iar Node 22 (cu --watch) reîncarcă procesul în milisecunde.
- **Pentru serviciul Worker (Python):** Acțiunea sync+restart este crucială. Deoarece Python încarcă codul în memorie la start, orice modificare necesită restartarea procesului worker pentru a fi preluată. Docker Compose Watch automatizează acest ciclu, eliminând comenzile manuale docker restart.

### 8.2. Observabilitate cu SigNoz

În loc de un stack complex Prometheus + Grafana + ELK, vom folosi SigNoz. Este o soluție open-source "all-in-one" pentru monitorizare (APM), log-uri și tracing, bazată nativ pe OpenTelemetry.

- **Integrare:** Atât Fastify, cât și workerii Python vor fi instrumentați cu SDK-urile OpenTelemetry. Acestea vor trimite automat trace-uri către instanța locală SigNoz.
- **Beneficiu:** Vizibilitate tranzacțională completă. Putem urmări un request de la click-ul din Refine, prin API-ul Fastify, până la job-ul procesat de workerul Python și apelul extern către LLM. Această vizibilitate este vitală pentru debugging-ul sistemelor distribuite.

## 9. Concluzii și Strategia de Evoluție

Abordarea "Vertical Slice" propusă transformă complexitatea inerentă a unui sistem modern de vânzări într-o serie de pași gestionabili și livrabili. Prin utilizarea tehnologiilor "Bleeding Edge" precum Node 22, Fastify v5 și Python 3.13, nu doar că obținem performanță superioară, dar simplificăm arhitectura, eliminând straturi de complexitate necesare în versiunile anterioare (ex: nodemon, multiprocessing, setup manual de tipuri).

### Puncte Cheie ale Strategiei

- **AI-Native Development:** Structura codului este optimizată pentru a fi înțeleasă și extinsă de AI (Cursor), nu doar de om.
- **Simbioza Node-Python:** Folosim Node.js pentru ceea ce face cel mai bine (I/O, API, Web) și Python pentru super-puterea sa (AI, Procesare date), legate eficient prin Docker și Redis.
- **Refine ca Accelerator:** Nu reinventăm roata pentru interfețele administrative. Refine preia greutatea operațiunilor CRUD, lăsând dezvoltatorul să se concentreze pe inovația din zona de Voice AI și Automatizare.
  Această arhitectură oferă fundația solidă pentru un produs software competitiv în 2026, construit și menținut de o singură persoană.

> **Tabel Rezumativ: Componente și Decizii Tehnice**

| Componentă        | Tehnologie 2026      | Motivul Alegere (1-Person-Team)                              |
| ----------------- | -------------------- | ------------------------------------------------------------ |
| Runtime API       | Node.js 22 LTS       | --watch nativ, performanță V8 Maglev, stabilitate ESM.       |
| Framework API     | Fastify v5           | Schema strictă pentru AI, Type Providers (Zod), performanță. |
| AI/Worker Runtime | Python 3.13          | No-GIL pentru procesare paralelă reală, ecosistem AI bogat.  |
| Frontend          | React 19 + Refine    | Optimistic UI, Actions, dezvoltare rapidă CRUD (Headless).   |
| Database          | PostgreSQL + Drizzle | SQL-like, performanță, inferență tipuri Zod.                 |
| Voice AI          | Pipecat (Python)     | Flexibilitate maximă, integrare nativă LLM local.            |
| Observabilitate   | SigNoz               | All-in-one (Logs/Metrics/Traces), ușor de self-hostat.       |
| Email             | Resend (apoi SES)    | DX superior pentru start rapid, migrare ușoară la scale.     |

## Lucrări citate

1. Cursor 2.0 - Full Tutorial for Beginners, accesată pe ianuarie 6, 2026, <https://www.youtube.com/watch?v=l30Eb76Tk5s>
2. Is Cursor a good fit for structured, enterprise-level monorepos using NX.js? - Reddit, accesată pe ianuarie 6, 2026, <https://www.reddit.com/r/cursor/comments/1j9gdpq/is_cursor_a_good_fit_for_structured/>
3. Using Cursor IDE Like a Pro: My Personal Guide to Building, Debugging, and Staying Sane, accesată pe ianuarie 6, 2026, <https://medium.com/@vikasranjan008/using-cursor-ide-like-a-pro-my-personal-guide-to-building-debugging-and-staying-sane-ed127bae546e>
4. Node.js 22 LTS: Key Features & Migration Guide for Devs - Objects, accesată pe ianuarie 6, 2026, <https://objects.ws/blog/node-js-22-lts-release/>
5. Python 3.13: The Gateway to High-Performance Multithreading Without GIL, accesată pe ianuarie 6, 2026, <https://dev.to/epam_india_python/python-313-the-gateway-to-high-performance-multithreading-without-gil-1dm7>
6. Release Notes for Node.js 22 - Red Hat Documentation, accesată pe ianuarie 6, 2026, <https://docs.redhat.com/en/documentation/red_hat_build_of_node.js/22/pdf/release_notes_for_node.js_22/Red_Hat_build_of_Node.js-22-Release_Notes_for_Node.js_22-en-US.pdf>
7. Node.js 22 is now available!, accesată pe ianuarie 6, 2026, <https://nodejs.org/en/blog/announcements/v22-release-announce>
8. Use Compose Watch - Docker Docs, accesată pe ianuarie 6, 2026, <https://docs.docker.com/compose/how-tos/file-watch/>
9. Docker Compose Watch: Hot Reload & Rebuild Explained (2025 Tutorial) - YouTube, accesată pe ianuarie 6, 2026, <https://www.youtube.com/watch?v=FhorvGysZ6w>
10. V5 Migration Guide - Fastify, accesată pe ianuarie 6, 2026, <https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/>
11. Type-Providers - Fastify, accesată pe ianuarie 6, 2026, <https://fastify.dev/docs/v5.6.x/Reference/Type-Providers/>
12. TypeBox vs Zod: Choosing the Right TypeScript Validation Library | Better Stack Community, accesată pe ianuarie 6, 2026, <https://betterstack.com/community/guides/scaling-nodejs/typebox-vs-zod/>
13. Zod is amazing. Here's why we're also using TypeBox - Val Town Blog, accesată pe ianuarie 6, 2026, <https://blog.val.town/blog/typebox/>
14. How Much FASTER Is Python 3.13 Without the GIL? - YouTube, accesată pe ianuarie 6, 2026, <https://www.youtube.com/watch?v=zWPe_CUR4yU>
15. State of Python 3.13 Performance: Free-Threading - CodSpeed, accesată pe ianuarie 6, 2026, <https://codspeed.io/blog/state-of-python-3-13-performance-free-threading>
16. Python 3.13: Blazing New Trails in Performance and Scale, accesată pe ianuarie 6, 2026, <https://thenewstack.io/python-3-13-blazing-new-trails-in-performance-and-scale/>
17. Using docker compose watch with Node.js - DEV Community, accesată pe ianuarie 6, 2026, <https://dev.to/mdazhar1038/using-docker-compose-watch-with-nodejs-2pb0>
18. React v19, accesată pe ianuarie 6, 2026, <https://react.dev/blog/2024/12/05/react-19>
    React 19: The Game-Changing Features That Will Transform Your Development in 2025 🚀, accesată pe ianuarie 6, 2026, <https://ramkumarkhub.medium.com/react-19-the-game-changing-features-that-will-transform-your-development-in-2025-f0bde7a13378>
19. Tailwind CSS v4.0, accesată pe ianuarie 6, 2026, <https://tailwindcss.com/blog/tailwindcss-v4>
20. Refine v5 is here!, accesată pe ianuarie 6, 2026, <https://refine.dev/blog/refine-v5-announcement/>
21. Migrating from 4.x.x to 5.x.x - Refine dev, accesată pe ianuarie 6, 2026, <https://refine.dev/docs/migration-guide/4x-to-5x/>
22. Request - Fastify, accesată pe ianuarie 6, 2026, <https://fastify.dev/docs/v5.2.x/Reference/Request/>
23. Data Provider - Refine dev, accesată pe ianuarie 6, 2026, <https://refine.dev/docs/data/data-provider/>
24. Create Data Provider From Scratch - Refine dev, accesată pe ianuarie 6, 2026, <https://refine.dev/docs/3.xx.xx/tutorial/understanding-dataprovider/create-dataprovider/>
25. Validation-and-Serialization - Fastify, accesată pe ianuarie 6, 2026, <https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/>
26. How to parse querystring parameter from URL in Fastify server? - Stack Overflow, accesată pe ianuarie 6, 2026, <https://stackoverflow.com/questions/57293116/how-to-parse-querystring-parameter-from-url-in-fastify-server>
27. Validation-and-Serialization - Fastify, accesată pe ianuarie 6, 2026, <https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/>
28. How to parse querystring parameter from URL in Fastify server? - Stack Overflow, accesată pe ianuarie 6, 2026, <https://stackoverflow.com/questions/57293116/how-to-parse-querystring-parameter-from-url-in-fastify-server>
29. PatrickJS/awesome-cursorrules: Configuration files that enhance Cursor AI editor experience with custom rules and behaviors - GitHub, accesată pe ianuarie 6, 2026, <https://github.com/PatrickJS/awesome-cursorrules>
30. Fastify cookie setup not working from subdomain - Stack Overflow, accesată pe ianuarie 6, 2026, <https://stackoverflow.com/questions/76428909/fastify-cookie-setup-not-working-from-subdomain>
31. Authentication Strategy - Fastify + Typescript + JWT - DEV Community, accesată pe ianuarie 6, 2026, <https://dev.to/lek890/authentication-strategy-application-fastify-typescript-jwt-52nb>
32. How to securely use JWT in react frontend? : r/reactjs - Reddit, accesată pe ianuarie 6, 2026, <https://www.reddit.com/r/reactjs/comments/1ngq4wj/how_to_securely_use_jwt_in_react_frontend/>
33. How to secure a refresh token in a JWT system when it's sent as an httpOnly cookie, accesată pe ianuarie 6, 2026, <https://stackoverflow.com/questions/79757620/how-to-secure-a-refresh-token-in-a-jwt-system-when-its-sent-as-an-httponly-cook>
34. Auth Provider - Refine dev, accesată pe ianuarie 6, 2026, <https://refine.dev/docs/authentication/auth-provider/>
35. Authentication - Refine dev, accesată pe ianuarie 6, 2026, <https://refine.dev/docs/guides-concepts/authentication/>
36. Drizzle ORM PostgreSQL Best Practices Guide (2025) - GitHub Gist, accesată pe ianuarie 6, 2026, <https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717>
37. Drizzle ORM PostgreSQL Best Practices Guide (2025) - GitHub Gist, accesată pe ianuarie 6, 2026, <https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717>
38. @samyx/drizzler-filters-sorters - npm, accesată pe ianuarie 6, 2026, <https://www.npmjs.com/package/%40samyx%2Fdrizzler-filters-sorters>
39. Dynamic query building - Drizzle ORM, accesată pe ianuarie 6, 2026, <https://orm.drizzle.team/docs/dynamic-query-building>
40. Simplifying Dynamic Data Filtering in Drizzle ORM Inspired by OData - Medium, accesată pe ianuarie 6, 2026, <https://medium.com/@shanakaabeysinghe/simplifying-dynamic-data-filtering-in-drizzle-orm-inspired-by-odata-0d8b5e31a3d4>
41. Resend vs Amazon Simple Email Service (SES) Comparison (2025), accesată pe ianuarie 6, 2026, <https://forwardemail.net/en/blog/resend-vs-amazon-simple-email-service-ses-email-service-comparison>
42. The 11 best transactional email services for developers in 2026 - Knock.app, accesată pe ianuarie 6, 2026, <https://knock.app/blog/the-top-transactional-email-services-for-developers>
43. Best email sending service for saas (verification, confirmation and etc) - Reddit, accesată pe ianuarie 6, 2026, <https://www.reddit.com/r/SaaS/comments/1ka8ih7/best_email_sending_service_for_saas_verification/>
44. Amazon SES Complaint Rate: How to maintain it under 1% - Salesforge, accesată pe ianuarie 6, 2026, <https://www.salesforge.ai/blog/amazon-ses-email>
45. Open Source Email Warmup: A Complete Guide - DEV Community, accesată pe ianuarie 6, 2026, <https://dev.to/tusharsmtpmaster/open-source-email-warmup-a-complete-guide-5d5b>
46. Manual email warm-up? Free/open-source alternatives? : r/coldemail - Reddit, accesată pe ianuarie 6, 2026, <https://www.reddit.com/r/coldemail/comments/1ooac9n/manual_email_warmup_freeopensource_alternatives/>
47. Difference Between LiveKit vs PipeCat Voice AI Platforms - F22 Labs, accesată pe ianuarie 6, 2026, <https://www.f22labs.com/blogs/difference-between-livekit-vs-pipecat-voice-ai-platforms/>
48. One-Second Voice-to-Voice Latency with Modal, Pipecat, and Open Models, accesată pe ianuarie 6, 2026, <https://modal.com/blog/low-latency-voice-bot>
49. 2025 Voice AI Guide: How to Make Your Own Real-Time Voice Agent (Part-1) - Medium, accesată pe ianuarie 6, 2026, <https://medium.com/@programmerraja/2025-voice-ai-guide-how-to-make-your-own-real-time-voice-agent-part-1-410c95eeebc8>
50. I built a Local AI Voice Assistant with Ollama + gTTS with interruption - Reddit, accesată pe ianuarie 6, 2026, <https://www.reddit.com/r/LocalLLaMA/comments/1k4b5xl/i_built_a_local_ai_voice_assistant_with_ollama/>
51. On-Premise Voice AI: Creating Local Agents with Llama, Ollama, and Pipecat, accesată pe ianuarie 6, 2026, <https://webrtc.ventures/2025/03/on-premise-voice-ai-creating-local-agents-with-llama-ollama-and-pipecat/>
52. Build a Local Voice + Text Virtual Assistant with Python, LiveKit & Ollama - Medium, accesată pe ianuarie 6, 2026, <https://medium.com/@tdawood140/build-a-local-voice-text-virtual-assistant-with-python-livekit-ollama-6021eeaf7491>
53. How-To Create Free Local Voice AI with Pipecat + Ollama + Kokoro - YouTube, accesată pe ianuarie 6, 2026, <https://www.youtube.com/watch?v=iTnpWmty52U>
54. Kokoro TTS and GLaDOS make a low latency, realistic AI voice assistant - Reddit, accesată pe ianuarie 6, 2026, <https://www.reddit.com/r/LocalLLaMA/comments/1i4h1qo/kokoro_tts_and_glados_make_a_low_latency/>
55. Modern Grafana Alternative - SigNoz, accesată pe ianuarie 6, 2026, <https://signoz.io/grafana-alternative/>
56. Best Microservices Monitoring Tools in 2026: Open-Source vs. SaaS | SigNoz, accesată pe ianuarie 6, 2026, <https://signoz.io/comparisons/microservices-monitoring-tools/>
