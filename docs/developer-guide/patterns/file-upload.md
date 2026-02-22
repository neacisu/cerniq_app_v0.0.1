# File Upload Pattern — CSV/Excel Import

**Priority:** HIGH | **Version:** 1.0 | **February 2026**

## Overview

This pattern covers file uploads for CSV/Excel import: multipart upload to API, validation, async processing via BullMQ, progress tracking via WebSocket, error row handling, and storage (S3 vs local).

---

## 1. Multipart Upload to API

Use `@fastify/multipart` for file uploads:

```typescript
import multipart from "@fastify/multipart";

await fastify.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

fastify.post("/v1/leads/import", async (req, reply) => {
  const data = await req.file();
  if (!data) throw new BadRequestError("No file uploaded");
  // Stream to temp or S3, then enqueue job
});
```

---

## 2. Validation

### File Type

- Allowed: `.csv`, `.xlsx`, `.xls`
- Check `mimetype`: `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Reject unknown types with `BadRequestError`

### File Size

- Max 10 MB for standard import
- Configurable per endpoint (e.g. 50 MB for bulk)

### Encoding

- CSV: UTF-8 (with BOM accepted)
- Excel: Auto-detect encoding; support common Romanian characters (ă, î, ș, ț)

---

## 3. Async Processing via BullMQ

Never process synchronously. Enqueue and return job ID:

```typescript
const job = await importQueue.add(
  "csv-import",
  {
    filePath: storedPath,
    userId: req.user.id,
    options: { skipHeader: true },
  },
  { jobId: `import-${uuid()}` },
);

return reply.status(202).send({ jobId: job.id, status: "queued" });
```

Queue: `cerniq:queue:import:csv` or `cerniq:queue:import:excel`

---

## 4. Progress Tracking via WebSocket

Expose progress via monitoring-api WebSocket or polling:

```typescript
// Worker updates progress
await job.updateProgress({ processed: 50, total: 200, errors: 2 });

// Client polls or subscribes
GET /v1/import/jobs/:jobId → { status, progress: { processed, total, errors } }
```

WebSocket channel: `import:job:{jobId}`. Emit `progress` and `completed` events.

---

## 5. Error Rows Handling

- Store failed rows in `import_errors` table: `job_id`, `row_number`, `raw_data`, `error_message`
- Return summary: `{ total: 200, success: 195, errors: 5, errorRows: [2, 15, 89, 102, 156] }`
- Allow download of error report (CSV of failed rows)

---

## 6. S3 vs Local Storage

| Environment | Storage    | Path Pattern                           |
| ----------- | ---------- | -------------------------------------- |
| Development | Local temp | `/tmp/cerniq-imports/{jobId}`          |
| Production  | S3 (MinIO) | `s3://cerniq-imports/{jobId}/file.csv` |

Use env var `IMPORT_STORAGE_TYPE` (`local` | `s3`). Clean up temp files after processing (or S3 lifecycle policy).

---

## 7. CSV Parsing

- Use `csv-parse` or `papaparse` for streaming
- Handle header row: configurable skip, auto-detect
- Map columns to schema: `{ name: 0, cui: 1, email: 2 }` or by header name
- Validate each row before insert; collect errors

---

## 8. Excel Parsing

- Use `exceljs` for .xlsx (streaming reader for large files)
- Support multiple sheets; first sheet or configurable
- Date columns: parse as ISO or Romanian format (DD.MM.YYYY)

---

## 9. Security

- **Virus scan:** Optional ClamAV or cloud scan before processing
- **Path traversal:** Sanitize filenames; never use user input in paths
- **Max rows:** Cap at 100k per import to prevent DoS

---

## 10. API Contract

```http
POST /v1/leads/import
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary>
options: { "skipHeader": true, "mapping": { "name": "Nume", "cui": "CUI" } }
```

Response 202: `{ jobId, status: "queued" }`

---

## 11. Related Documents

- `data-export.md` — Inverse flow
- `worker-pool-sizing.md` — Import queue concurrency
- `fsm-pattern.md` — Lead state after import

---

## Checklist

- [ ] Multipart with size limits
- [ ] File type and encoding validation
- [ ] Async BullMQ processing
- [ ] Progress tracking (WebSocket or poll)
- [ ] Error rows stored and reportable
- [ ] S3 for production, local for dev
- [ ] Column mapping support
- [ ] Security (path traversal, max rows)
