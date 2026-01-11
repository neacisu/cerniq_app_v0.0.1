**CERNIQ.APP**

**Documentațe Completă Frontend & UI/UX**

*Etapa 1: Pipeline Data Enrichment Bronze →Silver*

Versiune: 1.0 \| Ianuarie 2026

Stack: React 19 + Tailwind CSS v4 + Refine v5 + shadcn/ui

**CUPRINS**

**1. ARHITECTURA GENERALĂ FRONTEND**

Această documentațe detaliază complet toate componentele frontend pentru
Etapa 1 (Data Enrichment Pipeline) a aplicaței Cerniq.app. Documentul
acoperă fiecare pagină, componentă, buton, tabel, formular, dialog ș
element de interfață utilizat în sistem.

**1.1 Stack Tehnologic Frontend**

  ----------------- -------------- ---------------------------------------------
  **Componentă**    **Versiune**   **Scop**

  React             19.2.3         Framework UI principal cu Server Components

  Tailwind CSS      4.1+           Sistem de styling cu Oxide Engine

  Refine            5.x            Framework admin headless pentru CRUD

  shadcn/ui         Latest         Bibliotecă componente bazată pe Radix UI

  TanStack Table    8.x            Tabele de date avansate

  TanStack Query    5.x            State management pentru date server

  React Hook Form   7.x            Gestionare formulare

  Zod               3.x            Validare scheme

  Zustand           5.x            State management global client

  Sonner            1.x            Toast notifications

  Tremor            3.x            Componente dashboard ș vizualizăi

  Lucide React      0.x            Iconiț SVG

  ----------------- -------------- ---------------------------------------------

**1.2 Structura Directoarelor Frontend**

/apps/web/src/

  -------------- -------------------------- ----------------------------------------------
  **Director**   **Conțnut**                **Descriere**

  components/    Componente reutilizabile   UI primitives, layout, forms

  features/      Feature modules            Organizare pe funcțonalităț (Vertical Slice)

  pages/         Route components           Paginile aplicaței

  hooks/         Custom hooks               useDebounce, useLocalStorage, etc.

  lib/           Utilities                  Funcți helper, configurăi

  providers/     Context providers          Auth, Theme, Query providers

  styles/        CSS global                 Tailwind config, tokens

  types/         TypeScript types           Interfeț ș tipuri globale

  -------------- -------------------------- ----------------------------------------------

**2. LAYOUT PRINCIPAL Ș NAVIGAȚE**

**2.1 Componenta AppShell**

Layout-ul principal al aplicaței care încadrează toate paginile.

  ------------------ ----------------------------------- ----------------------
  **Element**        **Descriere**                       **Dimensiuni**

  Sidebar            Navigațe principală laterală        Lățme: 256px (16rem)

  Header             Bară superioară cu acțuni globale   Înățme: 64px (4rem)

  Main Content       Zona de conțnut principal           Flex-1, padding 24px

  Footer (opțonal)   Informați versiune                  Înățme: 48px

  ------------------ ----------------------------------- ----------------------

**2.1.1 Componenta Sidebar**

Sidebar-ul principal conțne navigața aplicaței ș informați utilizator.

  ----------------- -------------------------------- -----------------------------------
  **Secțune**       **Elemente**                     **Comportament**

  Logo Header       Logo Cerniq + Numele aplicaței   Click navigare la Dashboard

  User Section      Avatar, Nume, Email, Rol         Dropdown cu opțuni cont

  Navigation Menu   Link-uri paginilor principale    Active state, grupuri colapsabile

  Footer Stats      Workeri activi, Jobs în coadă    Real-time updates

  Collapse Button   Buton minimizare sidebar         Iconuri only mode

  ----------------- -------------------------------- -----------------------------------

**Stăi Sidebar:**

•Expanded (256px): Afișază iconuri + text + badge-uri

•Collapsed (64px): Doar iconuri, tooltip pe hover

•Mobile: Overlay cu backdrop, swipe to close

**2.1.2 Meniul de Navigațe Principal**

  -------------- --------------- ----------------- ------------ ----------------
  **Grup**       **Item Menu**   **Iconiță**       **Rută**     **Badge**

  Principal      Dashboard       LayoutDashboard   /dashboard   \-

  Principal      Contacte        Users             /contacts    Count total

  Principal      Companii        Building2         /companies   Count total

  Pipeline       Workeri         Cog               /workers     Active count

  Pipeline       Cozi            ListOrdered       /queues      Jobs waiting

  Pipeline       Jobs            Play              /jobs        Running count

  Date           Bronze          Database          /bronze      New records

  Date           Silver          DatabaseZap       /silver      Enriched count

  Date           Import          Upload            /import      \-

  Monitorizare   Logs            FileText          /logs        \-

  Monitorizare   Alerte          Bell              /alerts      Unread count

  Setăi          Configurare     Settings          /settings    \-

  Setăi          API Keys        Key               /api-keys    \-

  -------------- --------------- ----------------- ------------ ----------------

**2.1.3 Componenta Header**

  -------------------- --------------- -------------------------- --------------------------------
  **Element**          **Pozițe**      **Descriere**              **Acțune**

  Sidebar Toggle       Stânga          Hamburger icon             Toggle sidebar expand/collapse

  Breadcrumb           Stânga-Centru   Navigațe contextuală       Click pentru navigare

  Search Global        Centru          Cătare contacte/companii   Cmd+K shortcut

  Notifications Bell   Dreapta         Badge cu count unread      Dropdown notificăi

  Theme Toggle         Dreapta         Sun/Moon icon              Toggle dark/light mode

  User Avatar          Dreapta         Imagine utilizator         Dropdown cont utilizator

  -------------------- --------------- -------------------------- --------------------------------

**Breadcrumb Path Format:**

Dashboard \> Contacte \> Vizualizare Contact \> Ion Popescu

Fiecare segment este clickable pentru navigare rapidă.

**3. PAGINA: DASHBOARD**

Ruta: /dashboard

Descriere: Pagina principală cu vizualizăi aggregate ș acces rapid la
funcțonalităț.

**3.1 Componente Dashboard**

**3.1.1 KPI Cards Row**

Rând de carduri cu metrici principale afiște în partea superioară a
dashboard-ului.

  ---------- ------------------- ------------------- ------------- -------------------- -------------
  **Card**   **Titlu**           **Valoare**         **Iconiță**   **Trend**            **Culoare**

  1          Total Contacte      Numă contacte       Users         \% vs luna trecută   Blue

  2          Contacte Bronze     Count Bronze tier   Database      Noi azi              Orange

  3          Contacte Silver     Count Silver tier   DatabaseZap   Enriched azi         Gray

  4          Jobs în Procesare   Active jobs         Loader        Throughput/min       Yellow

  5          Jobs Eșate          Failed 24h          XCircle       \% fail rate         Red

  6          Workeri Activi      Running/Total       Cog           Health status        Green

  ---------- ------------------- ------------------- ------------- -------------------- -------------

**Structura Card KPI:**

  --------------------- ----------------------------------- -------------------------
  **Element**           **Stil**                            **Descriere**

  Container             bg-card rounded-lg p-6 shadow-sm    Card cu border subtle

  Header                flex justify-between items-center   Titlu + Iconiță

  Titlu                 text-sm text-muted-foreground       Label metric

  Iconiță               h-4 w-4 text-muted-foreground       Icon contextual

  Valoare               text-2xl font-bold                  Număul principal

  Trend                 text-xs text-green-500/red-500      +12% vs previous

  Sparkline (opțonal)   h-8 w-full                          Mini chart trend 7 zile

  --------------------- ----------------------------------- -------------------------

**3.1.2 Pipeline Overview Card**

Vizualizare progres pipeline Bronze →Silver.

  ------------------ -------------------------- ---------------------------------------------------
  **Element**        **Descriere**              **Date Afiște**

  Titlu              Pipeline Status            Text static

  Progress Steps     Stepper vizual orizontal   Bronze →Normalizare →Validare →Enrichment →Silver

  Step Bronze        Pas 1 cu count             X contacte în Bronze

  Step Normalizare   Pas 2 cu progres           X în procesare

  Step Validare      Pas 3 cu status            X validate

  Step Enrichment    Pas 4 cu status            X îmbogățte

  Step Silver        Pas final                  X contacte Silver ready

  Progress Bar       Bară completare globală    X% din total procesat

  ------------------ -------------------------- ---------------------------------------------------

**3.1.3 Recent Activity Feed**

Listă cronologică cu activităț recente în sistem.

  ----------------- ------------------------- ----------------------------------------
  **Element**       **Descriere**             **Format**

  Activity Item     Un eveniment din sistem   Iconiță + Text + Timestamp

  Icon              Tip eveniment             CheckCircle/XCircle/Info/AlertTriangle

  Text              Descriere eveniment       Job X completed în queue Y

  Timestamp         Când s-a întâmplat        Acum 5 minute / 14:32

  Actor (opțonal)   Cine a făut acțunea       System / User Name

  ----------------- ------------------------- ----------------------------------------

**Tipuri de Activităț Afiște:**

•Job completat cu succes (verde)

•Job eșat (roș)

•Contact avansat Bronze→Silver (albastru)

•Import finalizat (mov)

•Worker pornit/oprit (galben)

•Alertă sistem (portocaliu)

**3.1.4 Queue Status Grid**

Grid cu status-ul cozilor principale.

  ------------- ------------------- -----------------------------
  **Coloană**   **Descriere**       **Format**

  Queue Name    Numele cozii        bronze:ingest:csv-parser

  Status        Stare curentă       Badge: Running/Paused/Error

  Waiting       Jobs în așeptare    Numă cu bar chart mini

  Active        Jobs în procesare   Numă cu indicator pulsating

  Completed     Finalizate 24h      Numă cu trend arrow

  Failed        Eșate 24h           Numă roș dacă \> 0

  Actions       Butoane rapide      Pause/Resume/View

  ------------- ------------------- -----------------------------

**3.1.5 Charts Section**

Grafice pentru vizualizare date.

  ------------------- ---------------------- ------------------------------- --------------------------
  **Chart**           **Tip**                **Date**                        **Legendă**

  Processing Volume   Area Chart             Jobs/oră ultimele 24h           Completed vs Failed

  Enrichment Rate     Line Chart             \% enrichment succes 7 zile     ANAF/Termene/Email/Phone

  Contact Tiers       Donut Chart            Distribuțe Bronze/Silver/Gold   Procente

  Top Errors          Bar Chart Horizontal   Top 5 erori ultimele 24h        Count per error type

  ------------------- ---------------------- ------------------------------- --------------------------

**3.2 Acțuni Dashboard**

  ------------------- ---------------- ------------------------ ---------------
  **Buton**           **Pozițe**       **Acțune**               **Scurtăură**

  Import Nou          Header dreapta   Deschide dialog import   Ctrl+I

  Refresh Data        Header dreapta   Reîncarcă toate datele   Ctrl+R

  View All Queues     Queue card       Navigare /queues         \-

  View All Activity   Activity card    Navigare /logs           \-

  ------------------- ---------------- ------------------------ ---------------

**4. PAGINA: CONTACTE**

Ruta: /contacts

Descriere: Management complet al contactelor din sistem.

**4.1 Layout Pagină Contacte**

  ---------------- ----------------------------- ------------
  **Zonă**         **Componente**                **Înățme**

  Page Header      Titlu + Butoane acțune        64px

  Filter Bar       Filtre ș cătare               56px

  Tab Navigation   Bronze/Silver/Gold/All tabs   48px

  Data Table       Tabel principal contacte      Flex-1

  Pagination       Navigare pagini               56px

  ---------------- ----------------------------- ------------

**4.1.1 Page Header Contacte**

  ------------------ ------------------ ----------------------- ------------------------
  **Element**        **Tip**            **Text/Iconiță**        **Acțune**

  Titlu Pagină       H1                 Contacte                \-

  Subtitlu           Text muted         X contacte în total     \-

  Buton Import       Button primary     Plus + Import CSV       Dialog ImportContacte

  Buton Export       Button outline     Download + Export       Download CSV

  Buton Enrichment   Button secondary   Sparkles + Enrichment   Dialog BatchEnrichment

  ------------------ ------------------ ----------------------- ------------------------

**4.1.2 Tab-uri Filtrare după Tier**

  --------- ------------------ --------------- --------------------
  **Tab**   **Label**          **Badge**       **Filtru Aplicat**

  Toate     Toate Contactele   Count total     tier: all

  Bronze    Bronze             Count bronze    tier: bronze

  Silver    Silver             Count silver    tier: silver

  Gold      Gold               Count gold      tier: gold

  Invalid   Invalide           Count invalid   status: invalid

  --------- ------------------ --------------- --------------------

**4.1.3 Filter Bar Contacte**

  --------------------- --------------- --------------------------------- --------------------------
  **Filtru**            **Tip Input**   **Placeholder/Opțuni**            **Comportament**

  Cătare                Search Input    Caută după nume, email, CUI\...   Debounce 300ms

  Județ                 Select Multi    Toate județle + listă             Multi-select

  Status Enrichment     Select          All/Pending/Completed/Failed      Single select

  Email Valid           Select          All/Valid/Invalid/Unknown         Single select

  Telefon Valid         Select          All/Valid/Invalid/Unknown         Single select

  Dată Creare           Date Range      De la - Până la                   Date picker range

  Scor Completitudine   Range Slider    0% - 100%                         Dual slider

  Clear Filters         Button ghost    X Resetează                       Clear all active filters

  --------------------- --------------- --------------------------------- --------------------------

**4.2 Tabelul Principal Contacte**

Tabel cu toate contactele ș coloanele disponibile.

**4.2.1 Coloane Tabel Contacte**

  ---------------- --------------- ----------- -------------- -----------------------------------
  **Coloană**      **Tip**         **Lățme**   **Sortabil**   **Format Afișre**

  Checkbox         Checkbox        40px        Nu             Selectare rând

  Tier             Badge           80px        Da             Bronze/Silver/Gold badge colorat

  Nume Complet     Text + Avatar   200px       Da             Avatar + Prenume Nume

  Email            Text + Badge    220px       Da             <email@domain.com> + verified badge

  Telefon          Text + Badge    150px       Da             +40xxx + HLR status badge

  Companie         Text link       200px       Da             Click navigare companie

  Funcțe           Text            150px       Da             Director, Manager, etc.

  Județ            Text            100px       Da             Bucureși, Cluj, etc.

  Completitudine   Progress Bar    120px       Da             Bară % cu numă

  Status           Badge           100px       Da             Active/Pending/Invalid

  Creat La         Date            120px       Da             DD.MM.YYYY HH:mm

  Acțuni           Buttons         120px       Nu             View/Edit/Delete/Enrich

  ---------------- --------------- ----------- -------------- -----------------------------------

**4.2.2 Comportament Tabel**

  -------------------- -------------------------------------------------------- ---------------------
  **Funcțonalitate**   **Comportament**                                         **Trigger**

  Sortare              Click header sortează ASC, click 2 DESC, click 3 reset   Click pe header

  Resize Coloane       Drag separator între coloane                             Drag handle

  Reorder Coloane      Drag & drop header                                       Drag header

  Hide/Show Coloane    Dropdown cu checkboxes                                   Buton Columns

  Row Selection        Checkbox selectează, Shift+Click range                   Click checkbox

  Row Hover            Highlight row + show actions                             Mouse over

  Row Click            Navigare la detalii contact                              Click pe row

  Pin Rows             Pin la top tabel                                         Context menu option

  -------------------- -------------------------------------------------------- ---------------------

**4.2.3 Acțuni Rând Individual**

Dropdown menu care apare pe hover sau click buton acțuni.

  ---------------------- ------------- -------------- -------------------------------
  **Acțune**             **Iconiță**   **Keyboard**   **Efect**

  Vizualizare            Eye           Enter          Navigare la /contacts/:id

  Editare                Pencil        E              Deschide dialog edit

  Re-Enrichment          RefreshCw     R              Trigger enrichment complet

  Copiere Email          Copy          C              Copy email în clipboard

  Trimite Email          Mail          M              Deschide client email

  Apelare                Phone         P              Deschide dialer

  Vizualizare Companie   Building      B              Navigare la compania asociată

  Vizualizare Istoric    History       H              Deschide drawer istoric

  Separator              \-            \-             \-

  Marcare Invalid        XCircle       \-             Setează status invalid

  Șergere                Trash         Delete         Dialog confirmare șergere

  ---------------------- ------------- -------------- -------------------------------

**4.2.4 Bulk Actions Bar**

Bară care apare când sunt selectate rânduri multiple.

  ----------------- ------------------------------- ------------
  **Element**       **Descriere**                   **Pozițe**

  Selection Count   X contacte selectate            Stânga

  Select All        Link selectare toate paginile   Stânga

  Bulk Enrich       Buton Enrichment                Centru

  Bulk Export       Buton Export CSV                Centru

  Bulk Assign       Buton Atribuire user            Centru

  Bulk Tag          Buton Adaugă tag-uri            Centru

  Bulk Delete       Buton roș Șergere               Dreapta

  Clear Selection   X Anulează selecța              Dreapta

  ----------------- ------------------------------- ------------

**4.3 Pagination Contacte**

  -------------------- ---------------------------- ----------------------
  **Element**          **Descriere**                **Opțuni**

  Page Size Selector   Dropdown rânduri/pagină      10, 25, 50, 100, 200

  Page Info            Afișre X-Y din Z rezultate   Text static

  First Page           Buton prima pagină           ChevronFirst icon

  Prev Page            Buton pagina anterioară      ChevronLeft icon

  Page Numbers         Butoane numerotate           1, 2, 3, \..., N

  Next Page            Buton pagina urmăoare        ChevronRight icon

  Last Page            Buton ultima pagină          ChevronLast icon

  Go To Page           Input numă pagină            Input + Go button

  -------------------- ---------------------------- ----------------------

**5. PAGINA: DETALII CONTACT**

Ruta: /contacts/:id

Descriere: Pagină detaliată pentru vizualizarea ș editarea unui contact
individual.

**5.1 Layout Pagină Detalii**

  ----------------------- ---------------------------------- ------------------
  **Zonă**                **Conțnut**                        **Lățme**

  Left Panel              Info contact + acțuni principale   380px fix

  Main Content            Tab-uri cu date detaliate          Flex-1

  Right Panel (opțonal)   Timeline activitate                300px colapsabil

  ----------------------- ---------------------------------- ------------------

**5.1.1 Left Panel - Contact Card**

  ----------------- ----------------------------- --------------------------
  **Element**       **Descriere**                 **Format/Acțune**

  Avatar Mare       Fotografie sau inițale        120x120px rotund

  Tier Badge        Bronze/Silver/Gold            Badge colorat sub avatar

  Nume Complet      Prenume Nume                  Text bold 24px

  Funcțe            Titlu profesional             Text muted

  Companie Link     Numele companiei              Link navigare

  Separator         Linie orizontală              \-

  Email Row         Iconiță + email + status      Click to copy

  Telefon Row       Iconiță + telefon + carrier   Click to call

  WhatsApp Row      Iconiță + disponibilitate     Click to message

  LinkedIn Row      Iconiță + profil              External link

  Locațe Row        Iconiță + Oraș, Județ         \-

  Separator         Linie orizontală              \-

  Completitudine    Progress bar cu %             X% completat

  Data Creare       Iconiță + dată                Creat: DD.MM.YYYY

  Data Update       Iconiță + dată                Actualizat: DD.MM.YYYY

  Data Enrichment   Iconiță + dată                Enriched: DD.MM.YYYY

  Separator         Linie orizontală              \-

  Action Buttons    Grid 2 coloane                Acțuni principale

  ----------------- ----------------------------- --------------------------

**Action Buttons Grid:**

  ----------- -------------------- --------------- --------------------
  **Buton**   **Stil**             **Iconiță**     **Acțune**

  Editare     Primary full width   Pencil          Dialog editare

  Re-Enrich   Secondary            RefreshCw       Trigger enrichment

  Email       Outline              Mail            Compune email

  Call        Outline              Phone           Deschide dialer

  WhatsApp    Outline green        MessageCircle   Deschide WhatsApp

  Delete      Ghost destructive    Trash           Dialog confirmare

  ----------- -------------------- --------------- --------------------

**5.1.2 Main Content - Tab Navigation**

  --------------------- ------------------------------ -----------------
  **Tab**               **Conțnut**                    **Badge**

  Prezentare Generală   Date sumarizate                \-

  Date Fiscale          Info ANAF/Termene              Verified badge

  Validare              Status validăi email/telefon   Count validated

  Enrichment            Istoric enrichment             Count sources

  Companie              Detalii companie asociată      \-

  Istoric               Timeline modificăi             Count changes

  Raw Data              JSON original Bronze           \-

  --------------------- ------------------------------ -----------------

**5.1.3 Tab: Prezentare Generală**

  --------------------- ----------------------------------------------------------------------
  **Secțune**           **Câmpuri Afiște**

  Informați Personale   Prenume, Nume, Funcțe, Departament, Seniority

  Contact               Email principal, Email secundar, Telefon, Telefon secundar, WhatsApp

  Social                LinkedIn URL, Twitter, Facebook

  Preferinț Contact     Canal preferat, Ore preferate, Zile preferate

  GDPR                  Bază legală, Consimțăinte, Do Not Contact flags

  Tags                  Etichete personalizate

  --------------------- ----------------------------------------------------------------------

**5.1.4 Tab: Date Fiscale**

  ----------------- ------------------------------------------- ------------
  **Secțune**       **Câmpuri Afiște**                          **Sursă**

  Identificare      CUI, Nr. Reg. Com, IBAN                     ANAF

  Status Fiscal     Plăitor TVA, TVA la Încasare, Split TVA     ANAF

  e-Factura         Înregistrat e-Factura, Data înregistrare    ANAF

  Date Financiare   Cifră Afaceri, Profit, Angajaț, An Bilanț   Termene.ro

  Credit Score      Scor Risc, Categorie, Limite Credit         Termene.ro

  Datorii           Datorii ANAF, Datorii Totale                Termene.ro

  Litigii           Nr. Dosare Active, Ca Pârât, Insolvență     Termene.ro

  ----------------- ------------------------------------------- ------------

**5.1.5 Tab: Validare**

  ----------------------- --------------------------- -------------------------------------
  **Element**             **Descriere**               **Status Posibile**

  Email Validation Card   Status verificare email     Valid/Invalid/Unknown/Catch-All

  Email Provider          Detectat provider           Gmail/Yahoo/Corporate/Other

  Email Last Checked      Data ultimei verificăi      DD.MM.YYYY HH:mm

  Phone HLR Card          Status verificare HLR       Valid/Invalid/Unknown

  Phone Carrier           Operator telefonie          Orange/Vodafone/Telekom/Digi

  Phone Type              Tip telefon                 Mobile/Landline

  Phone Last Checked      Data ultimei verificăi      DD.MM.YYYY HH:mm

  WhatsApp Status         Disponibilitate WA          Available/Not Available/Unknown

  CUI Validation          Validare modulo 11 + ANAF   Valid Active/Valid Inactive/Invalid

  ----------------------- --------------------------- -------------------------------------

**5.1.6 Tab: Enrichment**

Vizualizare timeline a tuturor proceselor de enrichment.

  ---------------------- ------------------------------------------------
  **Element Timeline**   **Descriere**

  Sursă                  Iconiță + Nume sursă (ANAF/Termene/Hunter/etc)

  Timestamp              Data ș ora procesăii

  Status                 Badge Success/Failed/Partial

  Câmpuri Actualizate    Lista câmpurilor modificate

  Valori Anterioare      Collapsed view valori vechi

  Valori Noi             Valori noi adăgate

  Confidence Score       Procent încredere sursă

  Re-run Button          Buton reluare worker specific

  ---------------------- ------------------------------------------------

**6. PAGINA: COMPANII**

Ruta: /companies

Descriere: Management ș vizualizare companii (Silver Companies).

**6.1 Tabel Companii**

**6.1.1 Coloane Tabel Companii**

  --------------- ------------------ ------------------------------------
  **Coloană**     **Tip**            **Descriere**

  Checkbox        Checkbox           Selectare rând

  Denumire        Text + Logo        Logo 32x32 + Nume companie

  CUI             Text mono          Cod fiscal

  Status          Badge              Active/Inactive/Suspended/Radiated

  Plăitor TVA     Icon check/x       Status TVA

  e-Factura       Icon check/x       Înregistrat e-Factura

  CAEN            Badge              Cod CAEN principal

  Județ           Text               Locațe sediu social

  Cifră Afaceri   Number formatted   RON cu separator mii

  Angajaț         Number             Numă angajaț

  Scor Risc       Badge color        Low/Medium/High

  Contacte        Number link        Count contacte asociate

  Acțuni          Buttons            View/Edit/Enrich

  --------------- ------------------ ------------------------------------

**6.1.2 Filtre Specifice Companii**

  --------------------- -------------- ---------------------------------------
  **Filtru**            **Tip**        **Opțuni**

  Cătare                Search         Denumire, CUI

  Status Firmă          Multi-select   Active, Inactive, Suspended, Radiated

  Plăitor TVA           Select         All, Da, Nu

  e-Factura             Select         All, Înregistrat, Neînregistrat

  CAEN                  Autocomplete   Cătare cod sau denumire CAEN

  Județ                 Multi-select   Lista județ

  Cifră Afaceri Range   Range slider   Min-Max RON

  Angajaț Range         Range slider   Min-Max

  Scor Risc             Multi-select   Low, Medium, High

  Tip Exploatațe        Multi-select   Vegetală, Animală, Mixtă

  Membru OUAI           Select         All, Da, Nu

  Membru Cooperativă    Select         All, Da, Nu

  --------------------- -------------- ---------------------------------------

**7. PAGINA: WORKERI PIPELINE**

Ruta: /workers

Descriere: Dashboard monitorizare ș control workeri BullMQ.

**7.1 Layout Pagină Workeri**

  --------------- ------------------------------
  **Zonă**        **Conțnut**

  Summary Cards   4 carduri metrici globale

  Category Tabs   Tab-uri pe categorii workeri

  Worker Grid     Grid carduri status workeri

  Alert Panel     Alerte active sistem

  --------------- ------------------------------

**7.1.1 Summary Cards Workeri**

  ---------- --------------- -------------------- ---------------------
  **Card**   **Titlu**       **Metrică**          **Indicator**

  1          Total Workeri   61/61                Healthy badge verde

  2          Running         X workeri activi     Pulse animation

  3          Paused          X workeri în pauză   Badge galben

  4          Error State     X workeri cu erori   Badge roș dacă \> 0

  ---------- --------------- -------------------- ---------------------

**7.1.2 Tab-uri Categorii Workeri**

  -------------- --------------------------------------------------------- -----------
  **Tab**        **Categorii Incluse**                                     **Count**

  Toate          Toț cei 61 workeri                                        61

  Ingestie       CSV Parser, JSON Parser, PDF Extractor, Webhook, Manual   5

  Normalizare    Nume, Adrese, Telefoane, Formatare                        4

  Validare       CUI ANAF, Modulo11                                        2

  ANAF           Fiscal Status, TVA, e-Factura, Asociaț, Sedii             5

  Termene.ro     Company Info, Financials, Risk Score, etc.                8

  Email          Domain Discovery, Hunter.io, SMTP Verify, ZeroBounce      4

  Telefon        Format E164, HLR Lookup, Carrier, WhatsApp                4

  Web/Scraping   Fetch, Extract, Social Links, Logo                        4

  AI             Text Structure, Entity Extract, Industry Classify         3

  Geo            Geocode, Reverse, SIRUTA, Proximity                       4

  Agricol        APIA, OUAI, Cooperative                                   3

  Deduplicare    Hash Checker, Fuzzy Matcher                               2

  Quality        Completeness, Tier Calculator, Silver Promoter            3

  Agregare       Company, Contact Aggregator                               2

  Pipeline       Flow Start, Orchestrator, Health Monitor, Rate Sync       4

  -------------- --------------------------------------------------------- -----------

**7.1.3 Worker Card**

Fiecare worker este afișt ca un card în grid.

  ---------------- --------------------------- ----------------------
  **Element**      **Descriere**               **Format**

  Header           Nume queue + Status badge   Running/Paused/Error

  Category Badge   Categoria workerului        Color coded badge

  Rate Limit       Limită curentă/max          X/Y req/sec

  Metrics Grid     4 metrici principale        2x2 grid

  \- Waiting       Jobs în așeptare            Numă + icon

  \- Active        Jobs în procesare           Numă + pulse

  \- Completed     Finalizate 24h              Numă verde

  \- Failed        Eșate 24h                   Numă roș

  Throughput       Jobs/minut                  Mini sparkline

  Avg Duration     Timp mediu procesare        X.Xs

  Last Error       Ultimul mesaj eroare        Truncated + tooltip

  Actions          Butoane control             Pause/Resume/View

  ---------------- --------------------------- ----------------------

**7.1.4 Acțuni Worker Card**

  -------------- ------------- ------------- ------------------------------
  **Buton**      **Iconiță**   **Stare**     **Acțune**

  Pause          Pause         Running       Pauză procesare

  Resume         Play          Paused        Reluare procesare

  View Details   Eye           Orice         Navigare /workers/:queueName

  Retry Failed   RefreshCw     Has failed    Retry toate failed jobs

  Clear Queue    Trash2        Has waiting   Clear jobs în așeptare

  -------------- ------------- ------------- ------------------------------

**8. PAGINA: DETALII WORKER**

Ruta: /workers/:queueName

Descriere: Pagină detaliată pentru monitorizarea ș controlul unui worker
specific.

**8.1 Layout Detalii Worker**

  ---------------- ---------------------------------------
  **Zonă**         **Conțnut**

  Header           Nume worker + Status + Acțuni globale

  Metrics Panel    Carduri metrici detaliate

  Charts Section   Grafice throughput ș errors

  Jobs Table       Tabel cu jobs (filtrat pe status)

  Logs Panel       Real-time logs stream

  ---------------- ---------------------------------------

**8.1.1 Header Worker Detail**

  ----------------------- -----------------------------------
  **Element**             **Descriere**

  Back Button             Arrow left + Back to Workers

  Worker Name             Queue name formatted

  Category Badge          Categoria colorată

  Status Badge Large      Running/Paused/Error cu descriere

  Uptime                  Running for X hours

  Pause/Resume Button     Primary action

  Trigger Manual Button   Secondary action

  Settings Button         Configurare worker

  ----------------------- -----------------------------------

**8.1.2 Metrics Cards Detaliate**

  ----------------- ---------------- ---------------------------
  **Card**          **Metrică**      **Detalii**

  Waiting Jobs      X în așeptare    Oldest waiting: X min ago

  Active Jobs       X în procesare   Avg processing time

  Completed (24h)   X finalizate     Success rate: X%

  Failed (24h)      X eșate          Top error: message

  Delayed           X delayed        Next scheduled: time

  Throughput        X jobs/min       Peak: Y jobs/min

  Rate Limit        X/Y used         Resets in: Z sec

  Concurrency       X/Y slots        Config concurrency

  ----------------- ---------------- ---------------------------

**8.1.3 Jobs Table în Worker Detail**

  ----------- -----------------------------------
  **Tab**     **Descriere**

  Active      Jobs în procesare curent

  Waiting     Jobs în coadă de așeptare

  Completed   Jobs finalizate (paginat)

  Failed      Jobs eșate cu opțuni retry

  Delayed     Jobs programate pentru mai târziu

  ----------- -----------------------------------

**Coloane Tabel Jobs:**

  -------------- --------------------------------
  **Coloană**    **Descriere**

  Job ID         UUID job clickable

  Name           Nume job

  Status         Badge status

  Progress       Progress bar dacă în procesare

  Created At     Timestamp creare

  Started At     Timestamp pornire

  Finished At    Timestamp finalizare

  Duration       Durată procesare

  Attempts       X/Y încercăi

  Data Preview   Collapsed JSON preview

  Error          Mesaj eroare dacă failed

  Actions        Retry/View/Delete

  -------------- --------------------------------

**8.1.4 Manual Trigger Form**

Formular pentru triggerarea manuală a unui job.

  -------------- -------------- -------------- ----------------------
  **Câmp**       **Tip**        **Validare**   **Descriere**

  Job Data       JSON Editor    Valid JSON     Date pentru job

  Priority       Select         Required       High/Normal/Low

  Delay          Number input   \>= 0          Delay în milisecunde

  Max Attempts   Number input   1-10           Override default

  -------------- -------------- -------------- ----------------------

**Butoane Form:**

•Cancel - Închide dialog

•Submit Job - Trimite job în coadă

**9. PAGINA: COZI (QUEUES)**

Ruta: /queues

Descriere: Vizualizare ș management toate cozile BullMQ.

**9.1 Tabel Cozi**

  --------------- ---------------------------------------------- --------------
  **Coloană**     **Descriere**                                  **Sortabil**

  Queue Name      Numele cozii cu format layer:category:action   Da

  Category        Badge categorie                                Da

  Status          Running/Paused/Error                           Da

  Waiting         Count jobs waiting                             Da

  Active          Count jobs active                              Da

  Completed 24h   Count completed                                Da

  Failed 24h      Count failed                                   Da

  Delayed         Count delayed                                  Da

  Rate Limit      Current/Max                                    Nu

  Throughput      Jobs/min                                       Da

  Actions         Pause/Resume/Clear/View                        Nu

  --------------- ---------------------------------------------- --------------

**9.2 Bulk Actions Cozi**

  ------------------- ------------------------------------------ -------------------
  **Acțune**          **Descriere**                              **Confirmare**

  Pause All           Pauză toate cozile selectate               Dialog confirmare

  Resume All          Reluare toate cozile selectate             Nu

  Retry All Failed    Retry toate joburile failed din selecțe    Dialog confirmare

  Clear All Waiting   Șerge toate joburile waiting din selecțe   Dialog confirmare

  ------------------- ------------------------------------------ -------------------

**10. PAGINA: IMPORT DATE**

Ruta: /import

Descriere: Import contacte ș companii din fișere CSV/Excel.

**10.1 Wizard Import Multi-Step**

  --------- -------------------- --------------------------------------
  **Pas**   **Titlu**            **Descriere**

  1         Upload Fișer         Drag & drop sau selectare fișer

  2         Configurare          Setăi encoding, delimiter, header

  3         Mapare Coloane       Mapare coloane fișer →câmpuri sistem

  4         Preview & Validare   Preview date ș erori detectate

  5         Import               Confirmare ș progres import

  --------- -------------------- --------------------------------------

**10.1.1 Pas 1: Upload Fișer**

  ------------------- -----------------------------------
  **Element**         **Descriere**

  Dropzone            Zonă drag & drop cu border dashed

  Icon Upload         CloudUpload icon mare centrat

  Text Principal      Drag ș drop fișerul aici

  Text Secundar       sau click pentru selectare

  Formate Suportate   CSV, XLSX, XLS - max 50MB

  Browse Button       Buton selectare fișer

  File Preview        Afișre nume fișer după upload

  Remove Button       X pentru șergere fișer selectat

  ------------------- -----------------------------------

**10.1.2 Pas 2: Configurare Import**

  ----------------- --------- -----------------------------------------------
  **Câmp**          **Tip**   **Opțuni/Default**

  Tip Entitate      Radio     Contacte / Companii

  Encoding          Select    UTF-8 (auto-detect), Windows-1250, ISO-8859-2

  Delimiter (CSV)   Select    Virgulă, Punct ș virgulă, Tab, Auto-detect

  Header Row        Number    1 (default), 0 dacă făă header

  Skip Rows         Text      Numere rânduri de săit, separate prin virgulă

  Source Type       Select    import, apia, madr, manual

  ----------------- --------- -----------------------------------------------

**10.1.3 Pas 3: Mapare Coloane**

Interfață vizuală pentru maparea coloanelor din fișer la câmpurile
sistemului.

  ------------------ ----------------------------------------------
  **Element**        **Descriere**

  Left Column        Lista coloanelor din fișer cu preview valori

  Arrow/Connection   Indicator vizual mapare

  Right Column       Dropdown selectare câmp sistem

  Preview Values     Primele 3 valori din coloana respectivă

  Auto-Map Button    Încercare mapare automată bazată pe nume

  Clear Mapping      Reset toate mapăile

  Required Fields    Indicator \* pentru câmpuri obligatorii

  Unmapped Warning   Alert dacă coloane importante răân nemapate

  ------------------ ----------------------------------------------

**Câmpuri Sistem Disponibile pentru Mapare:**

Contacte: prenume, nume, email, telefon, functie, companie_cui

Companii: cui, denumire, adresa, judet, localitate, cod_caen

**10.1.4 Pas 4: Preview ș Validare**

  --------------------- ----------------------------------------------------
  **Element**           **Descriere**

  Summary Stats         X total rânduri, Y valide, Z cu erori, W duplicate

  Validation Errors     Lista erorilor grupate pe tip

  Preview Table         Tabel cu primele 10 rânduri transformate

  Error Rows Tab        Tab cu rândurile care au erori

  Skip Invalid Toggle   Switch pentru skip rânduri invalide

  Download Errors       Buton export CSV cu rândurile cu erori

  --------------------- ----------------------------------------------------

**10.1.5 Pas 5: Import ș Progres**

  ------------------ -------------------------------------
  **Element**        **Descriere**

  Progress Bar       Bară progres 0-100% cu animațe

  Status Text        Importing X of Y records\...

  Speed Indicator    \~Z records/second

  ETA                Estimated time remaining

  Live Counters      Success: X, Failed: Y, Duplicate: Z

  Cancel Button      Anulare import (cu confirmare)

  Complete Summary   Dialog succes cu statistici finale

  ------------------ -------------------------------------

**11. DIALOGURI Ș MODALE**

**11.1 Dialog: Editare Contact**

Modal pentru editarea datelor unui contact.

  --------------------- ----------------------------------------------------------------
  **Tab**               **Câmpuri**

  Informați Personale   Prenume\*, Nume\*, Funcțe, Departament, Seniority

  Contact               Email\*, Email Secundar, Telefon\*, Telefon Secundar, WhatsApp

  Social                LinkedIn URL

  Asociere              Companie (autocomplete CUI/Denumire)

  Preferinț             Canal Preferat, Ore Preferate, Zile Preferate

  GDPR                  Consimțăânt Email, SMS, WhatsApp, Telefon

  --------------------- ----------------------------------------------------------------

**Footer Dialog:**

•Cancel (Button ghost) - Închide făă salvare

•Save Changes (Button primary) - Salvează modificăile

**11.2 Dialog: Editare Companie**

  -------------- ------------------------------------------------------ ----------------
  **Tab**        **Câmpuri**

  Identificare   CUI\*, Denumire\*, Nr. Reg. Com, IBAN

  Locațe         Adresă, Localitatea, Județl, Cod Poșal

  Activitate     CAEN Principal, CAEN Secundare                         Forma Juridică

  Agricol        Suprafață Totală, Tip Exploatațe, Culturi Principale

  Credit         Limită Credit Aprobată, Termen Plată, Condiți Plată

  -------------- ------------------------------------------------------ ----------------

**11.3 Dialog: Confirmare Șergere**

  ---------------------------- -------------------------------------------------------------------------
  **Element**                  **Descriere**

  Icon                         AlertTriangle în cerc roș

  Titlu                        Confirmaț șergerea?

  Descriere                    Această acțune nu poate fi anulată. Entitatea X va fi șearsă permanent.

  Input Confirmare (opțonal)   Tastaț STERGE pentru confirmare

  Cancel Button                Button outline - Anulează

  Delete Button                Button destructive - Șerge permanent

  ---------------------------- -------------------------------------------------------------------------

**11.4 Dialog: Batch Enrichment**

  ----------------- ------------------------------------------------------------
  **Element**       **Descriere**

  Titlu             Start Batch Enrichment

  Selected Count    X contacte selectate pentru enrichment

  Profile Select    Checkbox list: Full Profile / Basic Only

  Sources Select    Checkbox list: ANAF, Termene.ro, Hunter.io, HLR, Geocoding

  Priority Select   Radio: High / Normal / Low

  Estimated Time    Estimare timp procesare

  Estimated Cost    Cost estimat credite API

  Cancel Button     Anulează

  Start Button      Start Enrichment

  ----------------- ------------------------------------------------------------

**11.5 Dialog: Job Details**

Modal pentru vizualizarea detaliată a unui job.

  --------------- --------------------------------------------
  **Secțune**     **Conțnut**

  Header          Job ID + Status Badge + Created timestamp

  Metadata        Queue, Name, Priority, Attempts

  Timestamps      Created, Started, Finished, Duration

  Input Data      JSON viewer expandable cu syntax highlight

  Result Data     JSON viewer cu rezultatul (dacă completed)

  Error Details   Stack trace formatat (dacă failed)

  Logs            Lista log entries pentru acest job

  Actions         Retry / Delete / Copy Job ID

  --------------- --------------------------------------------

**11.6 Drawer: Activity Timeline**

Drawer lateral pentru vizualizarea istoricului complet.

  --------------- --------------------------------------------
  **Element**     **Descriere**

  Header          Istoric Activitate + Close button

  Filter Tabs     Toate / Enrichment / Modificăi / Outreach

  Timeline List   Listă cronologică descrescăoare

  Timeline Item   Icon + Descriere + Timestamp + User/System

  Expand Button   Expandare detalii pentru item

  Load More       Buton încăcare mai multe entries

  --------------- --------------------------------------------

**12. COMPONENTE FORMULARE REUTILIZABILE**

**12.1 Text Input**

  ----------------- ----------- ---------------------------------
  **Proprietate**   **Tip**     **Descriere**

  label             string      Label deasupra input-ului

  placeholder       string      Text placeholder

  helperText        string      Text ajutăor sub input

  error             string      Mesaj eroare validare

  required          boolean     Indicator câmp obligatoriu

  disabled          boolean     Dezactivează input

  prefix            ReactNode   Element prefix (ex: iconiță)

  suffix            ReactNode   Element sufix (ex: buton clear)

  maxLength         number      Limită caractere cu counter

  ----------------- ----------- ---------------------------------

**Stăi Vizuale:**

•Default: border-input bg-background

•Focus: ring-2 ring-ring

•Error: border-destructive text-destructive

•Disabled: opacity-50 cursor-not-allowed

**12.2 Select / Dropdown**

  ----------------- ------------------------- ---------------------------
  **Proprietate**   **Tip**                   **Descriere**

  options           Array\<{value, label}\>   Opțunile disponibile

  placeholder       string                    Text când nimic selectat

  searchable        boolean                   Permite cătare în opțuni

  clearable         boolean                   Buton clear selecțe

  multi             boolean                   Permite selecțe multiplă

  loading           boolean                   Afișază spinner încăcare

  creatable         boolean                   Permite creare opțuni noi

  ----------------- ------------------------- ---------------------------

**12.3 Date Picker**

  ----------------- --------------- -----------------------------
  **Proprietate**   **Tip**         **Descriere**

  mode              single\|range   Selecțe simplă sau interval

  minDate           Date            Data minimă selectabilă

  maxDate           Date            Data maximă selectabilă

  disabledDates     Date\[\]        Date dezactivate

  showTime          boolean         Include selectare oră

  format            string          Format afișre (DD.MM.YYYY)

  ----------------- --------------- -----------------------------

**12.4 Autocomplete**

  ----------------- ---------- -------------------------------
  **Proprietate**   **Tip**    **Descriere**

  fetchOptions      function   Funcțe async cătare

  debounce          number     Delay cătare (ms)

  minChars          number     Caractere minim pentru cătare

  renderOption      function   Custom render opțune

  getOptionValue    function   Extrage valoare din opțune

  getOptionLabel    function   Extrage label din opțune

  ----------------- ---------- -------------------------------

**12.5 Checkbox & Radio**

  ----------------- --------- ----------------------------------
  **Proprietate**   **Tip**   **Descriere**

  label             string    Text label

  description       string    Descriere sub label

  indeterminate     boolean   Stare parțal selectat (checkbox)

  disabled          boolean   Dezactivează

  ----------------- --------- ----------------------------------

**12.6 Switch / Toggle**

  ----------------- ------------- -------------------
  **Proprietate**   **Tip**       **Descriere**

  label             string        Text label

  labelPosition     left\|right   Pozițe label

  size              sm\|md\|lg    Dimensiune switch

  disabled          boolean       Dezactivează

  ----------------- ------------- -------------------

**12.7 Textarea**

  ----------------- --------- -----------------------------
  **Proprietate**   **Tip**   **Descriere**

  rows              number    Numă rânduri vizibile

  autoResize        boolean   Resize automat după conțnut

  maxLength         number    Limită caractere cu counter

  showCount         boolean   Afișază counter caractere

  ----------------- --------- -----------------------------

**12.8 File Upload**

  ----------------- --------- ---------------------------
  **Proprietate**   **Tip**   **Descriere**

  accept            string    Tipuri fișere acceptate

  maxSize           number    Dimensiune maximă (bytes)

  multiple          boolean   Permite fișere multiple

  showPreview       boolean   Afișază preview imagini

  dragDrop          boolean   Activează drag & drop

  ----------------- --------- ---------------------------

**13. COMPONENTE UI REUTILIZABILE**

**13.1 Badge Component**

  ------------- -------------------------------------------- ----------------
  **Variant**   **Culori**                                   **Utilizare**

  default       bg-primary text-primary-foreground           Badge standard

  secondary     bg-secondary text-secondary-foreground       Badge secundar

  destructive   bg-destructive text-destructive-foreground   Erori, invalid

  outline       border text-foreground                       Subtle badge

  success       bg-green-100 text-green-800                  Status pozitiv

  warning       bg-yellow-100 text-yellow-800                Atențe

  info          bg-blue-100 text-blue-800                    Informațonal

  ------------- -------------------------------------------- ----------------

**Badge-uri Specifice Cerniq:**

  ----------- ------------------------------------------------- ---------------------
  **Badge**   **Stil**                                          **Utilizare**

  Bronze      bg-orange-100 text-orange-800 border-orange-300   Tier Bronze

  Silver      bg-gray-100 text-gray-800 border-gray-300         Tier Silver

  Gold        bg-yellow-100 text-yellow-800 border-yellow-400   Tier Gold

  Running     bg-green-100 text-green-800                       Worker/Job running

  Paused      bg-yellow-100 text-yellow-800                     Worker paused

  Error       bg-red-100 text-red-800                           Stare eroare

  Verified    bg-emerald-100 text-emerald-800                   Email/Phone valid

  Invalid     bg-rose-100 text-rose-800                         Email/Phone invalid

  ----------- ------------------------------------------------- ---------------------

**13.2 Button Variants**

  ----------------- -------------------------------------------- -----------------------------
  **Variant**       **Stil**                                     **Utilizare**

  default/primary   bg-primary text-primary-foreground           Acțune principală

  secondary         bg-secondary text-secondary-foreground       Acțune secundară

  destructive       bg-destructive text-destructive-foreground   Șergere, acțuni periculoase

  outline           border bg-background                         Acțune terțară

  ghost             hover:bg-accent                              Acțune subtilă

  link              text-primary underline-offset-4              Link stil buton

  ----------------- -------------------------------------------- -----------------------------

**Dimensiuni Button:**

•sm: h-8 px-3 text-xs

•default: h-10 px-4 py-2

•lg: h-11 px-8

•icon: h-10 w-10 (pentru butoane doar iconiță)

**13.3 Card Component**

  -------------------- --------------------- -------------------------------------
  **Sub-componentă**   **Descriere**         **Stil**

  Card                 Container principal   rounded-lg border bg-card shadow-sm

  CardHeader           Header card           flex flex-col space-y-1.5 p-6

  CardTitle            Titlu card            text-2xl font-semibold

  CardDescription      Subtitlu card         text-sm text-muted-foreground

  CardContent          Conțnut principal     p-6 pt-0

  CardFooter           Footer cu acțuni      flex items-center p-6 pt-0

  -------------------- --------------------- -------------------------------------

**13.4 Alert Component**

  ------------- --------------- ---------------------------------------------------
  **Variant**   **Iconiță**     **Culori**

  default       Info            bg-background text-foreground

  destructive   AlertCircle     border-destructive/50 text-destructive

  success       CheckCircle     border-green-500/50 text-green-700 bg-green-50

  warning       AlertTriangle   border-yellow-500/50 text-yellow-700 bg-yellow-50

  ------------- --------------- ---------------------------------------------------

**13.5 Toast Notifications**

  --------- ---------------------- ------------ -------------------
  **Tip**   **Iconiță**            **Durată**   **Utilizare**

  success   CheckCircle verde      3s           Acțune reuștă

  error     XCircle roș            5s           Eroare

  warning   AlertTriangle galben   4s           Avertisment

  info      Info albastru          3s           Informațe

  loading   Spinner                Persistent   Acțune în progres

  --------- ---------------------- ------------ -------------------

Pozițe: Bottom-right (default), stacked vertical

Max vizibile simultan: 3

**13.6 Progress Indicators**

  ------------------- ------------------------ ---------------------------------
  **Componentă**      **Utilizare**            **Props**

  Progress Bar        Progres linear           value (0-100), color, showLabel

  Circular Progress   Progres circular         value, size (sm/md/lg)

  Spinner             Încăcare indeterminată   size

  Skeleton            Placeholder încăcare     width, height, animated

  Steps               Multi-step progress      current, items, orientation

  ------------------- ------------------------ ---------------------------------

**13.7 Empty State**

  ------------------ -------------------------------------
  **Element**        **Descriere**

  Icon               Ilustrațe sau iconiță mare centrată

  Title              Titlu explicativ

  Description        Text explicațe detaliată

  Action Button      Buton acțune primară

  Secondary Action   Link sau buton secundar

  ------------------ -------------------------------------

**Empty States definite:**

•No contacts: Niciun contact găit + Import primul contact

•No results: Niciun rezultat pentru filtrele aplicate + Clear filters

•No workers: Workerii nu sunt configuraț + Setup workers

•No jobs: Niciun job în această coadă + Trigger manual

**13.8 Tooltip**

  ----------------- -------------------------------- -------------
  **Proprietate**   **Valori**                       **Default**

  side              top \| right \| bottom \| left   top

  align             start \| center \| end           center

  delayDuration     number (ms)                      300

  sideOffset        number (px)                      4

  ----------------- -------------------------------- -------------

**14. PAGINI SETĂI**

**14.1 Pagina Setăi Generale (/settings)**

  --------------------- -----------------------------------------------------------
  **Tab/Secțune**       **Câmpuri/Opțuni**

  Profil Utilizator     Nume, Email, Avatar, Parolă

  Preferinț Interfață   Temă (Light/Dark/System), Limbă, Timezone

  Notificăi             Email notifications, Browser notifications, tipuri alerte

  Organizațe            Nume organizațe, Logo, Domeniu

  Facturare             Plan curent, Usage, Istoric plăț

  --------------------- -----------------------------------------------------------

**14.2 Pagina API Keys (/api-keys)**

  ----------------------- -----------------------------------------------------------------
  **Element**             **Descriere**

  Lista API Keys          Tabel cu cheile existente

  Coloane                 Nume, Key (masked), Creat, Ultima utilizare, Permisiuni, Acțuni

  Create New Key          Dialog creare cheie nouă

  Key Name Input          Nume descriptiv pentru cheie

  Permissions             Checkboxes: Read, Write, Delete, Admin

  Expiration              Select: Never, 30 days, 90 days, 1 year

  Generated Key Display   Afișre one-time a cheii generate + Copy button

  Revoke Action           Buton revocare cu confirmare

  ----------------------- -----------------------------------------------------------------

**14.3 Pagina Integrăi (/settings/integrations)**

  --------------- ----------------------------------------
  **Integrare**   **Câmpuri Configurare**

  ANAF API        Status conexiune, Test button

  Termene.ro      API Key, Credite răase, Usage stats

  Hunter.io       API Key, Credite răase

  ZeroBounce      API Key, Credits balance

  CheckMobi       API Key, Account status

  xAI Grok        API Key, Model selection, Usage limits

  Nominatim       Custom endpoint (optional)

  --------------- ----------------------------------------

**15. PAGINA: LOGS**

Ruta: /logs

Descriere: Vizualizare ș cătare logs sistem.

**15.1 Layout Pagină Logs**

  ------------------ ---------------------------------------
  **Zonă**           **Conțnut**

  Filter Bar         Filtre pentru cătare logs

  Log Stream         Lista logs real-time sau paginată

  Log Detail Panel   Panel lateral cu detalii log selectat

  ------------------ ---------------------------------------

**15.2 Filtre Logs**

  ------------------ ------------------- ---------------------------------
  **Filtru**         **Tip**             **Opțuni**

  Search             Text input          Cătare în mesaj log

  Level              Multi-select        DEBUG, INFO, WARN, ERROR, FATAL

  Worker             Select searchable   Lista workeri

  Job ID             Text input          UUID job specific

  Correlation ID     Text input          UUID correlation

  Date Range         Date range picker   De la - Până la

  Live Mode Toggle   Switch              Stream real-time on/off

  ------------------ ------------------- ---------------------------------

**15.3 Log Entry Display**

  --------------- ---------------------- -------------------------------
  **Element**     **Descriere**          **Format**

  Timestamp       Data ș ora             YYYY-MM-DD HH:mm:ss.SSS

  Level Badge     Nivel log              Color coded badge

  Worker Name     Sursa log-ului         Text monospace

  Message         Mesajul principal      Text, poate fi lung/multiline

  Job ID          Link la job            Clickable UUID

  Expand Button   Afișre detalii         Chevron down

  Expanded Data   JSON cu toate datele   Syntax highlighted JSON

  --------------- ---------------------- -------------------------------

**Culori Level:**

•DEBUG: text-gray-500

•INFO: text-blue-600

•WARN: text-yellow-600

•ERROR: text-red-600

•FATAL: bg-red-600 text-white

**16. PAGINA: ALERTE**

Ruta: /alerts

Descriere: Vizualizare ș gestionare alerte sistem.

**16.1 Tipuri Alerte**

  ---------------- --------------- ------------- ---------------------------------------
  **Severitate**   **Iconiță**     **Culoare**   **Exemple**

  Critical         AlertOctagon    Red           Worker down, Database connection lost

  Error            XCircle         Orange-Red    High failure rate, API quota exceeded

  Warning          AlertTriangle   Yellow        Queue backlog high, Slow processing

  Info             Info            Blue          Worker restarted, Config changed

  ---------------- --------------- ------------- ---------------------------------------

**16.2 Alert Card**

  --------------- --------------------------------------
  **Element**     **Descriere**

  Severity Icon   Iconiță colorată stânga

  Title           Titlu scurt alert

  Description     Descriere detaliată

  Timestamp       Când s-a declanșt

  Source          Worker/Component sursă

  Actions         Acknowledge / Dismiss / View Details

  Status          New / Acknowledged / Resolved badge

  --------------- --------------------------------------

**17. TEME Ș DESIGN TOKENS**

**17.1 Culori Sistem**

  ----------------------- ------------------- ------------------- -----------------
  **Token**               **Light Mode**      **Dark Mode**       **Utilizare**

  \--background           0 0% 100%           222.2 84% 4.9%      Fundal pagină

  \--foreground           222.2 84% 4.9%      210 40% 98%         Text principal

  \--card                 0 0% 100%           222.2 84% 4.9%      Fundal carduri

  \--card-foreground      222.2 84% 4.9%      210 40% 98%         Text carduri

  \--primary              221.2 83.2% 53.3%   217.2 91.2% 59.8%   Culoare brand

  \--primary-foreground   210 40% 98%         222.2 47.4% 11.2%   Text pe primary

  \--muted                210 40% 96%         217.2 32.6% 17.5%   Fundal subtle

  \--muted-foreground     215.4 16.3% 46.9%   215 20.2% 65.1%     Text secundar

  \--destructive          0 84.2% 60.2%       0 62.8% 30.6%       Erori, șergeri

  \--border               214.3 31.8% 91.4%   217.2 32.6% 17.5%   Borduri

  \--ring                 221.2 83.2% 53.3%   224.3 76.3% 48%     Focus ring

  ----------------------- ------------------- ------------------- -----------------

**17.2 Spațere**

  ----------- ---------------- -------------------
  **Token**   **Valoare**      **Utilizare**

  space-0     0px              Făă spațu

  space-1     4px (0.25rem)    Spațu minimal

  space-2     8px (0.5rem)     Spațu mic

  space-3     12px (0.75rem)   Spațu mediu-mic

  space-4     16px (1rem)      Spațu standard

  space-6     24px (1.5rem)    Spațu mediu

  space-8     32px (2rem)      Spațu mare

  space-12    48px (3rem)      Spațu foarte mare

  ----------- ---------------- -------------------

**17.3 Tipografie**

  ------------- ----------------- ----------------- -----------------
  **Element**   **Font Size**     **Line Height**   **Font Weight**

  H1            36px (2.25rem)    40px              700 (Bold)

  H2            30px (1.875rem)   36px              600 (Semibold)

  H3            24px (1.5rem)     32px              600 (Semibold)

  H4            20px (1.25rem)    28px              600 (Semibold)

  Body          16px (1rem)       24px              400 (Regular)

  Body Small    14px (0.875rem)   20px              400 (Regular)

  Caption       12px (0.75rem)    16px              400 (Regular)

  Mono          14px (0.875rem)   20px              400 (font-mono)

  ------------- ----------------- ----------------- -----------------

**17.4 Border Radius**

  ------------- ---------------- ----------------------------
  **Token**     **Valoare**      **Utilizare**

  radius-sm     4px (0.25rem)    Butoane mici, badge-uri

  radius-md     8px (0.5rem)     Carduri, input-uri

  radius-lg     12px (0.75rem)   Modal-uri, containere mari

  radius-full   9999px           Avatar-uri, pill badges

  ------------- ---------------- ----------------------------

**17.5 Shadows**

  ----------- --------------------------------------------------------- ------------------
  **Token**   **Valoare**                                               **Utilizare**

  shadow-sm   0 1px 2px rgba(0,0,0,0.05)                                Carduri subtile

  shadow      0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)     Carduri standard

  shadow-md   0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)     Dropdown-uri

  shadow-lg   0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)   Modal-uri

  ----------- --------------------------------------------------------- ------------------

**18. RESPONSIVE DESIGN**

**18.1 Breakpoints**

  ---------------- --------------- ---------------------
  **Breakpoint**   **Min Width**   **Utilizare**

  sm               640px           Telefoane landscape

  md               768px           Tablete

  lg               1024px          Laptop-uri

  xl               1280px          Desktop

  2xl              1536px          Desktop mare

  ---------------- --------------- ---------------------

**18.2 Comportament Responsive**

  ---------------- ---------------------- ------------------------- ------------------------
  **Componentă**   **Mobile (\<768px)**   **Tablet (768-1024px)**   **Desktop (\>1024px)**

  Sidebar          Overlay drawer         Collapsed (icons)         Expanded (full)

  Header           Hamburger + Logo       Full header               Full header

  Data Table       Card list view         Horizontal scroll         Full table

  Filter Bar       Collapsible panel      Wrapped rows              Single row

  KPI Cards        1 column stack         2 columns                 4-6 columns

  Charts           Full width stack       2 columns                 Grid layout

  Detail Page      Stacked panels         Side panel                Split view

  ---------------- ---------------------- ------------------------- ------------------------

**19. KEYBOARD SHORTCUTS**

**19.1 Scurtăuri Globale**

  --------------- -----------------------------
  **Scurtăură**   **Acțune**

  Cmd/Ctrl + K    Deschide cătare globală

  Cmd/Ctrl + /    Afișază shortcuts help

  Cmd/Ctrl + I    Deschide dialog import

  Cmd/Ctrl + R    Refresh date pagină curentă

  Cmd/Ctrl + \\   Toggle sidebar

  Escape          Închide dialog/modal curent

  --------------- -----------------------------

**19.2 Scurtăuri Tabel**

  --------------- --------------------------------
  **Scurtăură**   **Acțune**

  Arrow Up/Down   Navigare între rânduri

  Space           Toggle selecțe rând curent

  Cmd/Ctrl + A    Selectează toate rândurile

  Enter           Deschide detalii rând selectat

  E               Editare rând selectat

  Delete          Șerge rânduri selectate

  --------------- --------------------------------

**19.3 Scurtăuri Formular**

  ------------------ ----------------------
  **Scurtăură**      **Acțune**

  Tab                Focus next field

  Shift + Tab        Focus previous field

  Cmd/Ctrl + Enter   Submit formular

  Escape             Anulează ș închide

  ------------------ ----------------------

**20. ACCESIBILITATE (WCAG 2.2 AA)**

**20.1 Cerinț Implementate**

  ---------------------- --------------------------------------------------
  **Criteriu**           **Implementare**

  Focus Visible          Ring vizibil 2px pe toate elementele interactive

  Color Contrast         Minim 4.5:1 pentru text, 3:1 pentru elemente UI

  Target Size            Minim 24x24px pentru toate butoanele

  Keyboard Navigation    Tab order logic, skip links

  Screen Reader          ARIA labels, live regions, landmarks

  Motion                 Respect prefers-reduced-motion

  Error Identification   Erori anunțte ș asociate cu câmpuri

  ---------------------- --------------------------------------------------

**20.2 ARIA Landmarks**

  --------------- ------------- ---------------------------
  **Landmark**    **Element**   **Descriere**

  banner          header        Header principal aplicațe

  navigation      nav           Meniu navigațe sidebar

  main            main          Conțnut principal pagină

  complementary   aside         Panouri laterale

  contentinfo     footer        Footer aplicațe

  --------------- ------------- ---------------------------

**21. ANEXE**

**21.1 Lista Completă Rute**

  ------------------------ ------------------- ------------------------
  **Rută**                 **Componentă**      **Descriere**

  /                        Redirect            Redirect la /dashboard

  /dashboard               DashboardPage       Pagina principală

  /contacts                ContactsListPage    Lista contacte

  /contacts/:id            ContactDetailPage   Detalii contact

  /companies               CompaniesListPage   Lista companii

  /companies/:id           CompanyDetailPage   Detalii companie

  /workers                 WorkersPage         Dashboard workeri

  /workers/:queueName      WorkerDetailPage    Detalii worker

  /queues                  QueuesPage          Lista cozi

  /jobs                    JobsPage            Lista jobs

  /jobs/:id                JobDetailPage       Detalii job

  /bronze                  BronzeDataPage      Date Bronze

  /silver                  SilverDataPage      Date Silver

  /import                  ImportWizardPage    Import date

  /logs                    LogsPage            Vizualizare logs

  /alerts                  AlertsPage          Alerte sistem

  /settings                SettingsPage        Setăi generale

  /settings/integrations   IntegrationsPage    Configurare integrăi

  /api-keys                ApiKeysPage         Gestionare API keys

  /login                   LoginPage           Autentificare

  /404                     NotFoundPage        Pagină negăită

  ------------------------ ------------------- ------------------------

**21.2 Lista Completă Iconiț Utilizate**

Toate iconițle provin din biblioteca Lucide React.

Navigation: LayoutDashboard, Users, Building2, Cog, ListOrdered, Play,
Database, DatabaseZap, Upload, FileText, Bell, Settings, Key

Actions: Plus, Pencil, Trash, Eye, RefreshCw, Copy, Mail, Phone,
MessageCircle, Download, Filter, Search, X, Check

Status: CheckCircle, XCircle, AlertTriangle, AlertCircle, Info, Loader,
Clock

Arrows: ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowUp,
ArrowDown

Misc: Sun, Moon, Menu, MoreHorizontal, MoreVertical, ExternalLink, Link,
Sparkles

**21.3 Convenți Denumire Componente**

  -------------------- ------------------- ---------------------------------
  **Tip**              **Convențe**        **Exemplu**

  Pagini               PascalCase + Page   DashboardPage, ContactsListPage

  Componente UI        PascalCase          Button, Card, DataTable

  Componente Feature   Feature + Type      ContactCard, WorkerMetrics

  Hooks                use + Scop          useContacts, useDebounce

  Contexte             Scop + Context      AuthContext, ThemeContext

  Utilities            camelCase           formatDate, parsePhone

  -------------------- ------------------- ---------------------------------

*---SFÂRȘT DOCUMENT ---*
