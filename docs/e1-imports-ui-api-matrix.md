# Matrice E1: Import & Bronze — HTTP ↔ `apps/web/src/lib/etapa1-api.ts` ↔ UI

**Sursă de adevăr server:** `apps/api/src/routes/imports-bronze.ts` (prefix înregistrat `/api/v1` în `apps/api/src/routes/index.ts`).  
**Sursă de adevăr client:** funcții exportate din `etapa1-api.ts` și hook-uri `use-etapa1.ts`.

## Import batch & control

| Metodă | Path API | Rol minim (din cod) | Funcție client | Pagini / flux UI |
| ------ | -------- | --------------------- | ---------------- | ---------------- |
| GET | `/api/v1/imports` | autentificat | `fetchImports` | `import.tsx` (listă), dashboard E1 (meta total) |
| POST | `/api/v1/imports` | operator | `uploadImport` (multipart) | `import-new.tsx` → `useUploadImport` |
| GET | `/api/v1/imports/:id` | autentificat | `fetchImportById` | `import-detail.tsx`, `import-mapping.tsx` |
| DELETE | `/api/v1/imports/:id` | operator | `deleteImportBatch` | `import.tsx` |
| POST | `/api/v1/imports/:id/cancel` | operator | `cancelImportBatch` | `import.tsx` |
| POST | `/api/v1/imports/:id/retry` | operator | `retryImportBatch` | `import.tsx` |
| GET | `/api/v1/imports/:id/headers` | autentificat | `fetchImportHeaders` | `import.tsx` (mapping flow) |
| PUT | `/api/v1/imports/:id/mapping` | operator | `saveImportMapping` | `import-mapping.tsx` |
| GET | `/api/v1/imports/mapping-targets` | autentificat | `fetchMappingTargets` | `import.tsx`, `import-mapping.tsx` |
| GET | `/api/v1/imports/template/columns` | autentificat | `fetchTemplateColumns` | `import.tsx` |
| GET | `/api/v1/imports/template?format=` | autentificat (fetch manual) | `downloadImportTemplate` | UI descărcare template |
| POST | `/api/v1/imports/:id/re-promote` | operator | `rePromoteImportBatch` | `import.tsx` / detalii |
| GET | `/api/v1/imports/:id/promote-job-status` | autentificat | `fetchPromoteJobStatus` | `import-detail.tsx` |
| GET | `/api/v1/imports/:id/pipeline-status` | autentificat | `fetchImportPipelineStatus` | `import-detail.tsx` |
| GET | `/api/v1/imports/:id/runtime-topology` | autentificat | `fetchImportRuntimeTopology` | `import-detail.tsx` |
| POST | `/api/v1/imports/:id/resume-promote` | operator | `resumePromoteImportBatch` | flux promote |
| GET | `/api/v1/imports/:id/reprocess-errors` | autentificat | `fetchImportReprocessErrors` | `import-detail.tsx` |
| POST | `/api/v1/imports/:id/reprocess-errors/resume` | operator | `resumeImportReprocessErrors` | `import-detail.tsx` |
| POST | `/api/v1/imports/:id/anaf-enrich` | operator | `triggerImportAnafEnrich` | `import-detail.tsx` |
| POST | `/api/v1/imports/:id/pause` | operator | `pauseImportBatch` | `import.tsx` |
| POST | `/api/v1/imports/:id/resume` | operator | `resumeImportBatch` | `import.tsx` |
| POST | `/api/v1/imports/:id/workers/:workerName/pause` | operator | `pauseImportWorker` | `import-detail.tsx` |
| POST | `/api/v1/imports/:id/workers/:workerName/resume` | operator | `resumeImportWorker` | `import-detail.tsx` |
| GET | `/api/v1/imports/:id/rows` | autentificat | `fetchImportRows` | `import-detail.tsx` |
| GET | `/api/v1/imports/:id/entities` | autentificat | `fetchImportEntities` | `import-detail.tsx` |
| GET | `/api/v1/imports/:id/quarantine` | autentificat | `fetchImportQuarantine` | `import-detail.tsx` |
| GET | `/api/v1/imports/:id/job-logs` | autentificat | `fetchImportJobLogs` | `import-detail.tsx` |
| GET | `/api/v1/imports/control` | autentificat | `fetchImportControl` | `import.tsx` |
| POST | `/api/v1/imports/control/pause` | operator | `pauseGlobalImports` | `import.tsx` |
| POST | `/api/v1/imports/control/resume` | operator | `resumeGlobalImports` | `import.tsx` |

## Bronze contacts (același fișier routes)

| Metodă | Path API | Rol minim | Funcție client | Pagini UI |
| ------ | -------- | --------- | -------------- | --------- |
| GET | `/api/v1/bronze/contacts` | autentificat | `fetchBronzeContacts` | `bronze.tsx` |
| GET | `/api/v1/bronze/contacts/:id` | autentificat | `fetchBronzeContactById` | `bronze-detail.tsx` |
| POST | `/api/v1/bronze/contacts/:id/reprocess` | operator | `reprocessBronzeContact` | `bronze-detail.tsx` |

## Enrichment cozi (fișier separat `enrichment.ts`)

Nu fac parte din `imports-bronze.ts`; documentate pentru claritate față de „Enrichment Queues” UI:

| Metodă | Path | Rol | Client | UI |
| ------ | ---- | --- | ------ | -- |
| GET | `/api/v1/enrichment/queues` | admin, owner, superadmin | `fetchQueueStatuses` | `enrichment-queues.tsx` |
| GET | `/api/v1/enrichment/queues/:name` | autentificat | `fetchQueueStatusByName` | hook `useQueueStatusByName` |
| POST | `/api/v1/enrichment/queues/:name/pause` | admin, owner, superadmin | `pauseQueue` | `enrichment-queues.tsx` |
| POST | `/api/v1/enrichment/queues/:name/resume` | admin, owner, superadmin | `resumeQueue` | `enrichment-queues.tsx` |

## Jurnal enrichment Silver

| Metodă | Path | Client | UI |
| ------ | ---- | ------ | -- |
| GET | `/api/v1/silver/enrichment-log` | `fetchSilverEnrichmentLog` | `enrichment-logs.tsx` |

---

**Notă audit:** Orice acțiune nouă în UI trebuie să aibă rând nou în această matrice (sau extindere OpenAPI) înainte de merge.
