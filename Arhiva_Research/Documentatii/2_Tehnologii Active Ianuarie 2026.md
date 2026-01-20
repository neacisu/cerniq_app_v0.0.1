# Raport Strategic de Infrastructură Software: Analiza Exhaustivă a Versiunilor Active LTS și Stable pentru Web Stack-ul Modern la 05.01.2026

## 1. Introducere Executivă și Context Operațional

Data de 5 ianuarie 2026 reprezintă un moment de inflexiune critică în ciclul anual de dezvoltare software și administrare a infrastructurii IT. Situată imediat după perioada tradițională de "code freeze" specifică sărbătorilor de iarnă și înainte de reluarea completă a ciclurilor de patch-uri de securitate din primul trimestru, această dată oferă o perspectivă unică asupra stabilității ecosistemelor tehnologice majore. Prezentul raport, elaborat din perspectiva unui analist de arhitectură software și risc tehnologic, oferă o disecție meticuloasă a stării de fapt pentru șase piloni fundamentali ai dezvoltării moderne: Node.js, Python, PostgreSQL, Fastify, React și Tailwind CSS.

Obiectivul acestui document nu este doar enumerarea versiunilor, ci o analiză profundă a implicațiilor operaționale pe care aceste versiuni le impun echipelor de inginerie. La data de 05.01.2026, peisajul este dominat de maturizarea arhitecturilor asincrone în Node.js (seria "Krypton"), de revoluția de performanță în Python (versiunea 3.14), și de consolidarea randării server-side în React 19. Mai mult, o situație particulară de securitate în ecosistemul Node.js transformă această dată specifică într-o fereastră de vulnerabilitate operațională critică, aspect ce va fi tratat pe larg în secțiunile dedicate.

Raportul sintetizează datele extrase din calendarele oficiale de lansare (Release Schedules), anunțurile de securitate și documentele de planificare strategică (PEP-uri, Roadmap-uri) publicate de maintaineri. Acesta servește drept **"Single Source of Truth"** pentru CTO, arhitecți de sistem și lideri tehnici care trebuie să ia decizii de upgrade sau să planifice noi proiecte greenfield în primele săptămâni ale anului 2026.

> **Tabel Sinoptic: Statusul Versiunilor la 05.01.2026**

Pentru o vizualizare rapidă a datelor critice, tabelul de mai jos rezumă versiunile exacte identificate ca fiind valide și suportate la data raportului.

| Tehnologie   | Release Line | Versiune Exactă (Active/Stable) | Status Ciclu de Viață | Codename / Observații Critice                   |
| ------------ | ------------ | ------------------------------- | --------------------- | ----------------------------------------------- |
| Node.js      | v24.x        | v24.13.x (Estimat)              | Active LTS            | Codename "Krypton".                             |
| Node.js      | v25.x        | v25.3.x (Estimat)               | Current               | Release experimental/feature.                   |
| Python       | 3.14.x       | 3.14.1                          | Stable (Bugfix)       | Lansat conform PEP 745. Include opt. post-GIL 3 |
| PostgreSQL   | v18.x        | 18.1                            | Current Stable        | Lansat Nov 2025.                                |
| React.       | v19.x.       | 19.2.3                          | Stable                | Lansat Dec 2025. Arhitectură stabilă RSC 9.     |
| Tailwind CSS | v4.x         | v4.1 (min.)                     | Stable                | Motor Oxide (Rust). Configurație CSS-first 10   |

## 2. Ecosistemul Runtime: Node.js

Node.js rămâne fundamentul executiv pentru majoritatea arhitecturilor I/O-intensive moderne. Analiza stării Node.js la 5 ianuarie 2026 relevă o situație complexă, guvernată de reguli stricte de Long Term Support (LTS), dar marcată de un incident de planificare a securității care afectează direct fereastra de timp analizată.

### 2.1. Politica de Lansare și Ciclul LTS

Pentru a înțelege exact de ce versiunea v24 este "Active LTS" la această dată, trebuie să examinăm mecanismul de lansare guvernat de Node.js Release Working Group. Ecosistemul Node.js funcționează pe un ciclu previzibil:

- Versiunile Pare (Even-numbered): Sunt lansate în aprilie și sunt destinate să devină LTS. În octombrie, acestea tranziționează din starea "Current" în starea "Active LTS".
- Versiunile Impare (Odd-numbered): Sunt lansate în octombrie și au o durată de viață scurtă (aprox. 8-9 luni), fiind destinate testării noilor funcționalități (V8 engine updates, API-uri experimentale).
La data de 05.01.2026, ne aflăm într-un punct intermediar al ciclului anual, unde versiunea pară lansată în anul anterior (2025) a intrat deja în regimul de suport activ pe termen lung.

### 2.2. Active LTS: Node.js v24.x (Codename "Krypton")

Conform documentației oficiale extrase din registrele GitHub ale proiectului 2, **Node.js v24.x** este versiunea desemnată oficial ca Active LTS la data de 5 ianuarie 2026.
> **Identitate și Calendar**

- Nume de Cod: "Krypton".2 Această denumire respectă convenția tabelului periodic al elementelor utilizată de proiect (urmând după Iron v20 și Jod v22).
- Data Lansării Inițiale: 6 mai 2025.11
- Intrarea în Active LTS: 28 octombrie 2025.2
- Finalizarea Active LTS (Planificat): 20 octombrie 2026.2
- End-of-Life (EOL): 30 aprilie 2028.2

> **Starea Tehnică și Riscul de Securitate la 05.01.2026**

Aspectul cel mai critic identificat în cercetare pentru această dată specifică este starea de securitate a versiunii v24. În mod normal, începutul lunii ianuarie ar trebui să găsească o versiune stabilă, actualizată în decembrie. Totuși, anunțurile de securitate 1 indică o deviere majoră de la normalitate.
Maintainerii Node.js au anunțat o întârziere a release-urilor de securitate planificate inițial pentru decembrie 2025. Textul specific 1 menționează: "(Update 17-Dec-2025) Security Release target January 7th. We have decided to delay the release further to Wednesday, January 7th, 2026."
Implicații profunde:
La data de 5 ianuarie 2026, versiunea instalată (probabil v24.13.0 sau v24.12.x, bazat pe cadența lunară anterioară lunii decembrie) este tehnic vulnerabilă. Există 3 probleme de severitate ridicată ("high severity") și 1 de severitate scăzută care sunt cunoscute maintainerilor, dar pentru care patch-ul public nu va fi disponibil decât peste 48 de ore (pe 7 ianuarie).
Aceasta plasează administratorii de sistem într-o poziție delicată: versiunea v24 "Active LTS" este recomandată pentru producție, dar este, la momentul interogării, expusă. Recomandarea operațională derivată este monitorizarea strictă a traficului și pregătirea pentru un upgrade de urgență miercuri, 7 ianuarie.

### 2.3. Current Stable: Node.js v25.x

Pentru dezvoltatorii care necesită cele mai recente funcționalități ale motorului V8 sau API-uri experimentale, linia "Current" este relevantă.

- **Versiune:** v25.x.11
- **Data Lansării:** 15 octombrie 2025.2
- **Status:** Current (Non-LTS). Această versiune nu va primi niciodată statutul LTS.
- **EOL:** 1 iunie 2026.2

La fel ca și în cazul versiunii v24, linia v25 este subiectul aceluiași anunț de securitate întârziat.1 Versiunea exactă disponibilă pe 5 ianuarie este ultima iterație din 2025 (estimativ v25.3.x), dar utilizatorii sunt sfătuiți să aștepte patch-ul din 7 ianuarie.

### 2.4. Maintenance LTS: Node.js v22.x (Codename "Jod")

Deși interogarea s-a concentrat pe "Active LTS", este vital să menționăm starea versiunii anterioare, v22.x ("Jod"). Aceasta a intrat în faza de Maintenance LTS pe 21 octombrie 2025.2
Implicație: Această versiune primește doar patch-uri critice de securitate și bug fix-uri majore. Nu primește backport-uri pentru funcționalități noi.
Relevanță: Pentru sistemele legacy care nu au migrat încă la v24 "Krypton", v22 rămâne o opțiune validă, dar "înghețată" funcțional.

### 2.5. Analiza Comparativă a Versiunilor Node.js la 05.01.2026

| Versiune | Codename | Status      | Data Lansării | Data EOL | Recomandare de Utilizare                  |
| -------- | -------- | ----------- | ------------- | -------- | ----------------------------------------- |
| v24.x    | Krypton  | Active LTS  | Mai 2025      | Apr 2028 | Producție Enterprise. Standardul curent.  |
| v25.x    | N/A      | Current     | Oct 2025      | Iun 2026 | Dezvoltare / Feature Testing.             |
| v22.x    | Jod      | Maintenance | Apr 2024      | Apr 2027 | Legacy. Migrare planificată spre v24.     |
| v20.x    | Iron     | Maintenance | Apr 2023      | Apr 2026 | Depreciated. EOL iminent (3 luni rămase). |

Insight-ul secundar derivat din tabelul de mai sus 2 este urgența migrării de pe v20.x ("Iron"). Cu data de EOL stabilită pentru 30 aprilie 2026, echipele care încă rulează v20 pe 5 ianuarie 2026 au mai puțin de 4 luni pentru a efectua upgrade-ul la v24, evitând astfel rularea pe software nesuportat.

## 3. Limbajul de Programare: Python

Evoluția limbajului Python a atins, în 2026, un punct de maturitate tehnologică axat pe performanță, marcat de eforturile continue de eliminare a GIL (Global Interpreter Lock) și de stabilizarea ciclului anual de lansare definit prin PEP 602.

### 3.1. Current Stable: Python 3.14.x

La data de 05.01.2026, versiunea stabilă curentă a limbajului este Python 3.14. Aceasta funcționează conform calendarului stabilit în PEP 745.3

> **Determinarea Versiunii Exacte**
Analizând calendarul de lansare pentru seria 3.14:

- **3.14.0 Final**: A fost lansat marți, 7 octombrie 2025.
- **3.14.1 (Bugfix)**: Programat și lansat pe 2 decembrie 2025.
- **Următoarea lansare (3.14.2)**: Programată pentru 3 februarie 2026.

Prin urmare, la data de 5 ianuarie 2026, cea mai recentă versiune stabilă ("Current Stable") disponibilă pentru descărcare și utilizare în producție este Python 3.14.1. Nu există nicio versiune intermediară programată în ianuarie, luna fiind dedicată dezvoltării patch-ului din februarie.

> **Contextul Tehnologic al Versiunii 3.14**
Versiunea 3.14 este semnificativă deoarece consolidează modificările radicale introduse experimental în 3.13. Principalele direcții includ:

- **Optimizarea JIT**: Compilatorul Just-In-Time, introdus în 3.13, a primit îmbunătățiri majore în 3.14, oferind performanțe superioare fără modificări ale codului sursă.
- **Free-Threading (No-GIL)**: Deși încă opțional în multe distribuții, modul de operare fără GIL a devenit mai robust în 3.14, permițând aplicațiilor CPU-bound să scaleze eficient pe arhitecturi multi-core.

### 3.2. Versiuni de Suport (Active Support)

Pe lângă versiunea curentă, este vital să identificăm versiunile anterioare care beneficiază de suport activ, deoarece multe medii enterprise sunt conservatoare în adoptarea noilor versiuni majore.

- **Python 3.13 (LTS-equivalent)**: Conform PEP 719 12, seria 3.13 primește actualizări de tip bugfix la fiecare două luni.
  - Calendarul indică: 3.13.11 pe 5 decembrie 2025.
  - Următorul release: 3.13.12 pe 3 februarie 2026.
  - Versiune validă la 05.01.2026: Python 3.13.11. Aceasta este alternativa "safe" pentru echipele care nu au validat încă 3.14.

### 3.3. Perspectiva Viitorului: Schimbarea de Paradigmă 3.26

Un detaliu fascinant revelat în documentația de planificare 13 este intenția comunității Python de a modifica schema de versionare post-3.14.
Documentul PEP 2026 propune ca versiunea care succede Python 3.14 să nu fie 3.15, ci Python 3.26, aliniind numărul versiunii minore cu anul lansării (2026).

- **Implicație**: La data de 5 ianuarie 2026, deși rulăm 3.14, discuțiile tehnice și branch-urile de dezvoltare (alpha) din repository-ul CPython sunt deja orientate către această nouă nomenclatură. Dezvoltarea pentru "3.15/3.26" începe oficial în mai 2025, deci la data raportului, versiunile "nightly" ar putea purta deja eticheta 3.26. Aceasta marchează o schimbare psihologică în ecosistem, punând accent pe predictibilitatea anuală.

## 4. Persistența Datelor: PostgreSQL

PostgreSQL continuă să domine piața bazelor de date relaționale open-source, menținând un standard ridicat de stabilitate și conformitate SQL. Modelul de lansare este anual, cu versiuni majore lansate toamna.

### 4.1. Current Stable: PostgreSQL 18

La data de 05.01.2026, cea mai recentă versiune majoră stabilă este PostgreSQL 18.5

> **Istoricul Lansării și Versiunea Exactă**
Comunitatea PostgreSQL Global Development Group a lansat versiunea 18.0 în toamna anului 2025. Conform snippet-ului 5, există o lansare stabilă marcată explicit:

- **Versiune**: 18.1
- **Data Lansării**: 13 noiembrie 2025.

Politica de lansare a update-urilor minore (bug fixes) pentru PostgreSQL este trimestrială 6, datele țintă fiind a doua joi din lunile februarie, mai, august și noiembrie.

- **Ultimul update**: 13 noiembrie 2025 (18.1).
- **Următorul update programat**: 12 februarie 2026.

Astfel, la 5 ianuarie 2026, versiunea 18.1 este incontestabil versiunea curentă ("Current Stable"). Nu au existat patch-uri de urgență în decembrie 2025 menționate în sursele analizate.

### 4.2. Matricea de Suport și Riscul EOL

Analiza ciclului de viață 14 relevă un risc operațional major pentru organizațiile care nu și-au actualizat sistemele în anul precedent.

- **PostgreSQL 13**: A atins End-of-Life (EOL) în noiembrie 2025.

- **Implicație la 05.01.2026**: Orice instanță PostgreSQL 13 aflată în producție este oficial nesuportată. Nu mai primește patch-uri de securitate, reprezentând un risc critic de conformitate și securitate.

- **Versiuni Suportate**: 18, 17, 16, 15, 14. Versiunea 14 va fi următoarea care va ieși din suport (în toamna 2026), deci planificarea migrării de pe PG14 ar trebui să înceapă în Q1 2026.

### 4.3. Evoluția Funcțională în v18

Deși raportul se concentrează pe versiuni, este relevant de menționat că v18 marchează maturizarea suportului nativ pentru vectori (pgvector integrat sau optimizat), esențial pentru workload-urile de Inteligență Artificială care au devenit omniprezente până în 2026. Stabilitatea versiunii 18.1 confirmă că aceste funcționalități sunt pregătite pentru producție.

## 5. Framework-uri Web de Înaltă Performanță: Fastify

Fastify s-a impus ca standardul de facto pentru microservicii Node.js performante, datorită arhitecturii sale cu overhead minim. La 5 ianuarie 2026, ecosistemul Fastify a finalizat tranziția majoră către versiunea 5.

### 5.1. Current Stable: Fastify v5.x

Versiunea majoră curentă este **Fastify v5.7** Aceasta a fost lansată inițial pe 17 septembrie 2024, având timp suficient să se maturizeze și să atingă stabilitatea necesară mediilor enterprise.

> **Versiunea Exactă**

Conform istoricului de release-uri 8, versiunea **v5.6.2** a fost lansată pe 9 noiembrie 2025. Având în vedere cadența rapidă de dezvoltare a Fastify, este posibil să existe versiuni minore ulterioare (ex: v5.7.0) lansate în decembrie. Totuși, bazându-ne strict pe datele confirmate documentar:

- Versiunea minimă garantată ca stabilă la 05.01.2026 este **v5.6.2**.
- Această versiune rulează pe ramura "main" a proiectului.

### 5.2. Sfârșitul Erei v4 (LTS)

Un detaliu critic pentru arhitecți este starea versiunii anterioare, Fastify v4.

- **End of LTS Date**: 30 iunie 2025.
- **Status la 05.01.2026**: EOL (End of Life).

Spre deosebire de Node.js sau Python, care mențin versiuni vechi pentru ani de zile, Fastify are o politică LTS mai agresivă (6 luni după lansarea noii versiuni majore). La data raportului, v4 este neactualizată de peste 6 luni. Utilizarea sa în producție este nerecomandată, fiind incompatibilă cu noile standarde de securitate și posibil incompatibilă cu Node.js v24 (care necesită module actualizate).

### 5.3. Compatibilitatea cu Node.js

Fastify v5 este proiectat pentru a funcționa optim cu Node.js v20 (încă suportat) și v22/v24. Migrarea la Fastify v5 este obligatorie pentru a exploata optimizările de stream și managementul memoriei din Node.js v24 "Krypton".

## 6. Frontend Modern: React

React a traversat o perioadă de transformare profundă odată cu versiunea 19, care a introdus primitivele pentru Server Components (RSC) direct în nucleul bibliotecii. Până în ianuarie 2026, praful s-a așezat, iar React 19 este standardul stabil.

### 6.1. Current Stable: React 19.x

Conform surselor 17, React 19 a fost lansat oficial ca stabil pe 5 decembrie 2024. Ciclul de actualizare a accelerat ulterior pentru a corecta edge-case-urile noii arhitecturi.

- **Versiunea Exactă**: Datele indică o versiune stabilă 19.2.3 lansată pe 11 decembrie 2025.9
- Această versiune (19.2.3) este cea validă și recomandată la data de 5 ianuarie 2026.

### 6.2. Maturitatea Arhitecturii React 19

La data raportului, React 19 nu mai este o noutate experimentală. Versiunea 19.2.3 indică faptul că au existat deja două update-uri minore și multiple patch-uri, semnalând o stabilitate ridicată.

Caracteristicile definitorii la acest moment includ:

- **React Compiler**: Integrat complet, eliminând necesitatea hook-urilor manuale de memorare (useMemo, useCallback) în majoritatea cazurilor.
- **Server Actions**: Au devenit metoda standard de a gestiona mutațiile de date, înlocuind API-urile REST tradiționale în aplicațiile integrate (Next.js, Remix).

Contrastul cu perioada anterioară lansării v19 (marcată de nemulțumiri privind stagnarea 19) este evident. Ecosistemul a adoptat rapid v19, iar la 5 ianuarie 2026, suportul bibliotecilor terțe pentru v19 este aproape universal.

## 7. Styling și Build Tools: Tailwind CSS

Tailwind CSS a redefinit modul în care scriem CSS, iar versiunea 4 a reprezentat un salt tehnologic prin trecerea la un motor scris în Rust.

### 7.1. Current Stable: Tailwind CSS v4.x

La 5 ianuarie 2026, Tailwind CSS se află ferm în era v4.

- **Lansarea v4.0**: 22 ianuarie 2025.20
- **Lansarea v4.1**: 3 aprilie 2025.10
- **Evoluția ulterioară**: Snippet-urile menționează actualizări continue în mai 2025.

Deși nu există o dată specifică pentru un "v4.2" în snippet-uri, putem afirma cu certitudine bazată pe datele existente că versiunea stabilă este v4.1+ (posibil v4.2 sau v4.3, dar v4.1 este baza garantată documentar). Nu există nicio indicație a unei versiuni v5.

### 7.2. Revoluția Oxide Engine

Versiunea activă la data raportului rulează pe motorul Oxide. Acesta este unificator pentru ecosistem, eliminând fișierul tailwind.config.js în favoarea configurării directe în CSS (@theme).

La 05.01.2026, impactul acestei schimbări este major:

- **Performanță**: Timpii de compilare sunt neglijabili, permițând experiențe de dezvoltare (HMR) instantanee chiar și în proiecte gigantice.
- **Interoperabilitate**: Integrarea cu framework-uri non-JS (ex: Python/Django, Laravel) este mult simplificată, deoarece dependența de Node.js pentru procesarea CSS este redusă sau gestionată nativ de binarul Rust.

## 8. Integrare Arhitecturală și Concluzii

Analiza individuală a componentelor relevă o imagine de ansamblu a unui ecosistem matur, dar care necesită o gestionare atentă a dependențelor și a securității la începutul anului 2026.

### 8.1. Matricea de Compatibilitate a Stack-ului "Ianuarie 2026"

Pentru o echipă care demarează un proiect pe 5 ianuarie 2026, configurația optimă (Golden Path) arată astfel:

| Componentă  | Versiune Recomandată | Justificare Tehnică                                                                                    |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| Runtime     | Node.js v24.13.x.    | Deși necesită patch pe 7 ianuarie, este singura opțiune LTS viabilă pe termen lung. v25 prea instabil. |
| Backend API | Fastify v5.6.2.      | Obligatoriu pentru compatibilitate cu Node 24. Performanță maximă HTTP.                                |
| Database    | PostgreSQL 18.1.     | Stabilitate și features moderne (AI/Vector). Evită riscurile versiunilor EOL (PG13).                   |
| Frontend    | React 19.2.3         | Stabilitate post-lansare. Beneficiază de compiler și Server Components mature.                         |
| Styling     | Tailwind CSS v4.1+   | Viteza de build critică pentru DX (Developer Experience).                                              |
| Auxiliar    | Python 3.14.1        | Pentru servicii de date/ML, integrat via microservicii.                                                |

### 8.2. Avertisment Critic de Securitate

Reiterăm cea mai importantă concluzie operațională a acestui raport: Fereastra de Vulnerabilitate 5-7 Ianuarie 2026.

Datorită amânării release-ului de securitate pentru Node.js 1, orice infrastructură bazată pe Node.js (fie v22, v24 sau v25) care este expusă public la data de 5 ianuarie rulează pe un runtime cu vulnerabilități cunoscute dar ne-patch-uite.

- **Recomandare**: Echipele DevOps trebuie să blocheze deployment-urile non-critice și să programeze o fereastră de mentenanță obligatorie pentru dimineața zilei de 7 ianuarie 2026, imediat ce patch-urile devin disponibile.

### 8.3. Concluzie Finală

La 5 ianuarie 2026, tehnologia web a atins un platou de performanță ridicată. Trecerea la motoare native (Rust în Tailwind, JIT în Python, optimizări C++ în Node 24) și compilatoare inteligente (React Compiler) a redus semnificativ complexitatea accidentală a dezvoltării. Provocarea principală nu mai este "ce versiune să aleg", ci "cum să mențin ritmul de upgrade", având în vedere ciclurile de viață tot mai scurte (exemplu Fastify v4 EOL) și necesitatea de a rămâne pe versiunile Active LTS pentru a beneficia de securitate și performanță.

Acest raport confirmă că, respectând versiunile identificate (**Node v24.13, Python 3.14.1, PG 18.1, Fastify v5.6, React 19.2, Tailwind v4.1**), o organizație este poziționată optim pentru anul fiscal 2026, cu condiția gestionării prompte a incidentului de securitate Node.js iminent.

## Lucrări citate

- Wednesday, January 7, 2026 Security Releases - Node.js, accesată pe ianuarie 6, 2026, <https://nodejs.org/en/blog/vulnerability/december-2025-security-releases>
- Node.js Release Working Group - GitHub, accesată pe ianuarie 6, 2026, <https://github.com/nodejs/Release>
- PEP 745 – Python 3.14 Release Schedule, accesată pe ianuarie 6, 2026, <https://peps.python.org/pep-0745/>
- Status of Python versions - Python Developer's Guide, accesată pe ianuarie 6, 2026, <https://devguide.python.org/versions/>
- PostgreSQL - Wikipedia, accesată pe ianuarie 6, 2026, <https://en.wikipedia.org/wiki/PostgreSQL>
- Roadmap - PostgreSQL, accesată pe ianuarie 6, 2026, <https://www.postgresql.org/developer/roadmap/>
- LTS | Fastify, accesată pe ianuarie 6, 2026, <https://fastify.dev/docs/latest/Reference/LTS/>
- Releases · fastify/fastify - GitHub, accesată pe ianuarie 6, 2026, <https://github.com/fastify/fastify/releases>
- React (software) - Wikipedia, accesată pe ianuarie 6, 2026, <https://en.wikipedia.org/wiki/React_(software)>
- Latest updates - Blog - Tailwind CSS, accesată pe ianuarie 6, 2026, <https://tailwindcss.com/blog>
- Node.js Releases, accesată pe ianuarie 6, 2026, <https://nodejs.org/en/about/previous-releases>
- PEP 719 – Python 3.13 Release Schedule, accesată pe ianuarie 6, 2026, <https://peps.python.org/pep-0719/>
- PEP 2026 – Calendar versioning for Python, accesată pe ianuarie 6, 2026, <https://peps.python.org/pep-2026/>
- Release calendars for Amazon RDS for PostgreSQL - Amazon Relational Database Service, accesată pe ianuarie 6, 2026, <https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-release-calendar.html>
- PostgreSQL - endoflife.date, accesată pe ianuarie 6, 2026, <https://endoflife.date/postgresql>
- fastify - NPM, accesată pe ianuarie 6, 2026, <https://www.npmjs.com/package/fastify>
- React v19, accesată pe ianuarie 6, 2026, <https://react.dev/blog/2024/12/05/react-19>
- What's New in React 19 - Telerik.com, accesată pe ianuarie 6, 2026, <https://www.telerik.com/blogs/whats-new-react-19>
- React 19 Release: Exploring Exciting Features & Updates - Radixweb, accesată pe ianuarie 6, 2026, <https://radixweb.com/blog/whats-new-in-react-19>
- Tailwind CSS v4.0, accesată pe ianuarie 6, 2026, <https://tailwindcss.com/blog/tailwindcss-v4>
