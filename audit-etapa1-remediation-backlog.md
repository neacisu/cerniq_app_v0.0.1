# Backlog Remediere Etapa 1 - Post-Audit

**Data creării:** 2026-03-20  
**Bazat pe:** `audit-etapa1-assertions-matrix.md`  
**Protocol:** Anti-halucinare strict - fiecare task include instrucțiuni specifice

---

## PRIORITIZARE

### P0 - CRITIC (Blocante, trebuie rezolvate imediat)
- GAP-001: Contract mismatch Dashboard
- GAP-002: Contract mismatch Approval Review  
- GAP-003: Metodă lipsă `resumeBlockedJob()`

### P1 - HIGH (Impact major, rezolvare în sprint curent)
- GAP-010: Lipsă teste integration API
- GAP-011: Lipsă teste HITL quality review + resume
- GAP-004: Conflict documentație `data_quality` vs `quality_review`
- GAP-005: Conflict documentație `bullmq_*` vs `blocked_*`

### P2 - MEDIUM (Impact moderat, planificare pentru sprint următor)
- GAP-006: Coada `maintenance:import-file-cleanup` nu este în registry
- GAP-007: Worker `hitl:resume` nu folosește `blockedJobId` corect
- GAP-012: Lipsă teste E2E pipeline flow
- GAP-013: Teste HITL E2E superficiale

### P3 - LOW (Impact minor, backlog)
- GAP-008: Trigger-ele DB nu sunt verificate
- GAP-009: FSM states constraint vs doc
- GAP-014: Acoperire redusă teste workers

---

## TASK-URI REMEDIERE

### TASK-001: Fix Contract Mismatch Dashboard (GAP-001)

**Prioritate:** P0 - CRITIC  
**Dependențe:** None  
**Estimare:** 2h

#### Instrucțiuni Anti-halucinare
- NU presupune ce chei vrea frontend; citește explicit `apps/web/src/pages/dashboard/index.tsx:218-278`
- NU presupune ce returnează backend; citește explicit `apps/api/src/routes/dashboard.ts:45-167`
- NU schimba ambele părți simultan; alege o direcție (backend sau frontend) și documentează de ce

#### Acțiuni
1. **Verificare contract actual:**
   - Citește `apps/web/src/pages/dashboard/index.tsx` linia 218-278 pentru a identifica exact ce chei citește frontend
   - Citește `apps/api/src/routes/dashboard.ts` linia 45-167 pentru a identifica exact ce returnează backend
   - Documentează diferențele într-un comentariu înainte de fix

2. **Decizie arhitecturală:**
   - Opțiunea A: Backend returnează `hitl` și `quality` (conform frontend)
   - Opțiunea B: Frontend citește `approvals` și `pipeline` (conform backend)
   - **Recomandare:** Opțiunea A (backend se aliniază cu frontend) pentru că frontend este deja implementat

3. **Implementare:**
   - Dacă Opțiunea A: Modifică `apps/api/src/routes/dashboard.ts` să returneze:
     ```typescript
     {
       hitl: {
         pending: number,
         resolvedToday: number,
         overdue: number
       },
       quality: {
         avgScore: number,
         eligible: number,
         blocked: number
       }
     }
     ```
   - Dacă Opțiunea B: Modifică `apps/web/src/pages/dashboard/index.tsx` să citească `approvals` și `pipeline`

4. **Testare:**
   - Verifică manual că dashboard-ul afișează date corecte
   - Adaugă test în `apps/api/__tests__/dashboard.test.ts` (dacă nu există) care verifică shape-ul răspunsului

#### Definiție de Done
- [ ] Contract aliniat între frontend și backend
- [ ] Dashboard afișează date corecte
- [ ] Test adăugat pentru shape răspuns
- [ ] Documentat decizia arhitecturală

---

### TASK-002: Fix Contract Mismatch Approval Review (GAP-002)

**Prioritate:** P0 - CRITIC  
**Dependențe:** None  
**Estimare:** 1h

#### Instrucțiuni Anti-halucinare
- NU presupune structura răspunsului; citește explicit `apps/api/src/routes/enrichment.ts:220`
- NU presupune cum citește frontend; citește explicit `apps/web/src/pages/etapa1/approval-review.tsx:28`
- NU presupune tipul TypeScript; citește explicit `apps/web/src/lib/etapa1-api.ts:592-597`

#### Acțiuni
1. **Verificare contract actual:**
   - Citește `apps/api/src/routes/enrichment.ts` linia 220: backend returnează `{ success: true, data: { ...task, entityData } }`
   - Citește `apps/web/src/pages/etapa1/approval-review.tsx` linia 28: frontend citește `detailQuery.data?.entityData`
   - Citește `apps/web/src/lib/etapa1-api.ts` linia 592-597: TypeScript așteaptă `entityData` la rădăcină

2. **Decizie:**
   - **Recomandare:** Backend mută `entityData` la rădăcină pentru a se alinia cu TypeScript și frontend

3. **Implementare:**
   - Modifică `apps/api/src/routes/enrichment.ts` linia 220:
     ```typescript
     return { 
       success: true, 
       data: task,
       entityData 
     };
     ```

4. **Testare:**
   - Verifică manual că approval review afișează entity data
   - Adaugă test în `apps/api/__tests__/enrichment.test.ts` (dacă nu există)

#### Definiție de Done
- [ ] Backend returnează `entityData` la rădăcină
- [ ] Frontend afișează entity data corect
- [ ] Test adăugat pentru shape răspuns

---

### TASK-003: Implementare `resumeBlockedJob()` (GAP-003)

**Prioritate:** P0 - CRITIC  
**Dependențe:** None  
**Estimare:** 3h

#### Instrucțiuni Anti-halucinare
- NU presupune ce face `resumeBlockedJob()`; citește `etapa1-hitl-system.md:358-361` pentru cerințe
- NU presupune cum funcționează BullMQ; citește `workers/enrichment/src/workers/hitl-resume-after-approval.ts:164-180` pentru pattern existent
- NU presupune structura job-ului; verifică `blockedJobId` și `blockedQueueName` în schema

#### Acțiuni
1. **Analiză cerințe:**
   - Citește `docs/specifications/Etapa 1/etapa1-hitl-system.md` linia 358-361 pentru cerințe
   - Citește `packages/db/src/services/approval-service.ts` linia 360 pentru context apel
   - Citește `workers/enrichment/src/workers/hitl-resume-after-approval.ts:164-180` pentru pattern similar

2. **Implementare:**
   - Adaugă metodă privată `resumeBlockedJob()` în `ApprovalService`:
     ```typescript
     private async resumeBlockedJob(task: ApprovalTask) {
       if (!task.blockedJobId || !task.blockedQueueName) return;
       
       const queue = createQueue(task.blockedQueueName);
       const job = await queue.getJob(task.blockedJobId);
       
       if (job) {
         await job.retry();
       }
       
       await queue.close();
     }
     ```

3. **Testare:**
   - Adaugă test în `packages/db/__tests__/approval-service.test.ts` (dacă nu există)
   - Testează că job-ul este reluat când task-ul este decis

#### Definiție de Done
- [ ] Metoda `resumeBlockedJob()` implementată
- [ ] Metoda este apelată în `decide()` când există `blockedJobId`
- [ ] Test adăugat pentru resume blocked job
- [ ] Documentat comportamentul

---

### TASK-004: Reconciliere Documentație `data_quality` vs `quality_review` (GAP-004)

**Prioritate:** P1 - HIGH  
**Dependențe:** None  
**Estimare:** 2h

#### Instrucțiuni Anti-halucinare
- NU presupune care este corect; verifică schema reală în `packages/db/src/schemas/approval.ts:40-50`
- NU edita toate documentele simultan; identifică documentul canonic și actualizează celelalte
- NU șterge referințe istorice; marchează-le ca deprecated

#### Acțiuni
1. **Identificare surse conflict:**
   - `master-specification.md:1402` menționează `data_quality`
   - `etapa1-workers-triggers.md:128` menționează `data_quality`
   - Schema reală folosește `quality_review` (verificat în audit)

2. **Actualizare documente:**
   - Actualizează `master-specification.md:1402` să folosească `quality_review`
   - Actualizează `etapa1-workers-triggers.md:128` să folosească `quality_review`
   - Adaugă notă de deprecare pentru `data_quality` dacă este necesar

3. **Verificare:**
   - Caută toate referințele la `data_quality` în docs: `grep -r "data_quality" docs/`
   - Actualizează toate referințele

#### Definiție de Done
- [ ] Toate documentele folosesc `quality_review`
- [ ] Referințe la `data_quality` sunt marcate deprecated sau eliminate
- [ ] Documentat în changelog

---

### TASK-005: Reconciliere Documentație `bullmq_*` vs `blocked_*` (GAP-005)

**Prioritate:** P1 - HIGH  
**Dependențe:** None  
**Estimare:** 1h

#### Instrucțiuni Anti-halucinare
- NU presupune care este corect; verifică schema reală în `packages/db/src/schemas/approval.ts:87-88`
- NU edita toate documentele simultan; identifică documentul canonic

#### Acțiuni
1. **Identificare surse conflict:**
   - `hitl-unified-system.md:124` folosește `bullmq_job_id`, `bullmq_queue_name`
   - Schema reală folosește `blocked_job_id`, `blocked_queue_name`

2. **Actualizare documente:**
   - Actualizează `hitl-unified-system.md:124` să folosească `blocked_*`

3. **Verificare:**
   - Caută toate referințele la `bullmq_job_id` în docs

#### Definiție de Done
- [ ] Toate documentele folosesc `blocked_*`
- [ ] Referințe la `bullmq_*` sunt eliminate

---

### TASK-006: Adăugare Coadă în Registry (GAP-006)

**Prioritate:** P2 - MEDIUM  
**Dependențe:** None  
**Estimare:** 30min

#### Instrucțiuni Anti-halucinare
- NU presupune configurația cozii; citește `workers/enrichment/src/main.ts:88` pentru context
- NU adăuga coada fără verificare; verifică dacă există deja în registry

#### Acțiuni
1. **Verificare:**
   - Citește `workers/shared/src/queue-registry.ts` pentru a verifica dacă `maintenance:import-file-cleanup` există
   - Citește `workers/enrichment/src/main.ts:88` pentru context

2. **Decizie:**
   - Opțiunea A: Adaugă coada în registry
   - Opțiunea B: Documentează că este "extra queue" în comentarii

3. **Implementare:**
   - Dacă Opțiunea A: Adaugă în `queue-registry.ts` cu configurație adecvată
   - Dacă Opțiunea B: Adaugă comentariu în `main.ts` explicând de ce este extra

#### Definiție de Done
- [ ] Coada este fie în registry, fie documentată ca extra
- [ ] Configurația este consistentă

---

### TASK-007: Fix Worker `hitl:resume` pentru `blockedJobId` (GAP-007)

**Prioritate:** P2 - MEDIUM  
**Dependențe:** TASK-003  
**Estimare:** 2h

#### Instrucțiuni Anti-halucinare
- NU presupune cum funcționează resume; citește `workers/enrichment/src/workers/hitl-resume-after-approval.ts:164-180`
- NU presupune structura job-ului; verifică `blockedJobId` în task metadata

#### Acțiuni
1. **Analiză:**
   - Citește `workers/enrichment/src/workers/hitl-resume-after-approval.ts:164-180` pentru pattern actual
   - Verifică dacă `blockedJobId` este folosit sau doar `blockedQueueName` + `sourcePayload`

2. **Implementare:**
   - Dacă trebuie să folosească `blockedJobId`: implementează logică similară cu `resumeBlockedJob()` din TASK-003
   - Dacă pattern-ul actual este intenționat: documentează de ce se folosește `sourcePayload` în loc de `blockedJobId`

#### Definiție de Done
- [ ] Worker folosește `blockedJobId` corect SAU este documentat de ce nu
- [ ] Test adăugat pentru resume cu blocked job

---

### TASK-008: Scriere Teste Integration API (GAP-010)

**Prioritate:** P1 - HIGH  
**Dependențe:** TASK-001, TASK-002  
**Estimare:** 8h

#### Instrucțiuni Anti-halucinare
- NU presupune ce endpoint-uri există; citește `docs/api/openapi-etapa1.yaml` pentru lista completă
- NU presupune payload-urile; citește `apps/api/src/routes/*.ts` pentru implementări reale
- NU scrie teste generice; fiecare test trebuie să verifice comportament specific

#### Acțiuni
1. **Identificare endpoint-uri critice:**
   - Citește `docs/api/openapi-etapa1.yaml` pentru lista endpoint-urilor
   - Prioritizează: Dashboard, Approvals, Imports, Silver/Gold companies

2. **Scriere teste:**
   - Creează `apps/api/__tests__/integration/dashboard.test.ts`
   - Creează `apps/api/__tests__/integration/approvals.test.ts`
   - Creează `apps/api/__tests__/integration/imports.test.ts`
   - Creează `apps/api/__tests__/integration/silver-gold.test.ts`

3. **Pattern test:**
   - Fiecare test verifică: auth, tenant isolation, payload validation, response shape, error handling

#### Definiție de Done
- [ ] Teste pentru toate endpoint-urile critice
- [ ] Coverage ≥80% pentru API routes
- [ ] Teste rulează în CI/CD

---

### TASK-009: Scriere Teste HITL Quality Review + Resume (GAP-011)

**Prioritate:** P1 - HIGH  
**Dependențe:** TASK-003  
**Estimare:** 4h

#### Instrucțiuni Anti-halucinare
- NU presupune trigger-ul; citește `workers/enrichment/src/workers/o2-quality-rollup.ts:70-84`
- NU presupune flow-ul resume; citește `workers/enrichment/src/workers/hitl-resume-after-approval.ts:118-145`

#### Acțiuni
1. **Scriere teste:**
   - Test pentru quality review trigger când `promotionStatus === "review_required"`
   - Test pentru resume după quality review approval
   - Test pentru resume după quality review rejection

2. **Fișier:**
   - Creează `workers/enrichment/src/workers/hitl-quality-review.test.ts` sau adaugă în test existent

#### Definiție de Done
- [ ] Teste pentru quality review trigger
- [ ] Teste pentru resume flow
- [ ] Teste rulează în CI/CD

---

## DEPENDENȚE TASK-URI

```
TASK-001 (Dashboard) ──┐
TASK-002 (Approval)    ├──> TASK-008 (Teste API)
TASK-003 (resumeJob) ──┘
                       │
TASK-003 (resumeJob) ──┼──> TASK-007 (hitl:resume)
                       │
TASK-003 (resumeJob) ──┴──> TASK-009 (Teste HITL)
```

---

## METRICI SUCCES

- [ ] 0 gapuri P0 rămase
- [ ] ≤2 gapuri P1 rămase
- [ ] Test coverage API ≥80%
- [ ] Test coverage HITL ≥95%
- [ ] Toate conflictele documentație reconciliate

---

**Document generat:** 2026-03-20  
**Ultima actualizare:** 2026-03-20
