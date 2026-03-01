# Data Export Pattern — CSV/Excel/PDF

**Priority:** MEDIUM | **Version:** 1.0 | **February 2026**

## Overview

This pattern covers data export: streaming large datasets, background job processing, download links with expiry, and format selection.

---

## 1. Streaming Large Datasets

For exports > 10k rows, **do not** load all into memory. Stream to response:

```typescript
const cursor = await db.select().from(leads).where(...).$dynamic();
const stream = cursor.stream();

reply.raw.writeHead(200, {
  'Content-Type': 'text/csv',
  'Content-Disposition': 'attachment; filename=leads.csv',
});
for await (const row of stream) {
  reply.raw.write(toCsvRow(row) + '\n');
}
reply.raw.end();
```

Use Drizzle's `.$dynamic()` or raw cursor for streaming.

---

## 2. Background Job Processing

For very large exports (100k+ rows) or complex formats (Excel with formatting):

1. API enqueues job: `export:leads` with filters
2. Worker generates file (stream to temp or S3)
3. Worker stores file, generates signed URL
4. Client polls `GET /v1/exports/:jobId` or receives WebSocket notification
5. Client downloads from signed URL

```typescript
const job = await exportQueue.add("leads", { userId, filters, format: "xlsx" });
return reply.status(202).send({ jobId: job.id, status: "processing" });
```

---

## 3. Download Links with Expiry

- **Signed URL (S3):** 1h expiry
- **Local temp:** Delete after 24h; link expires when file deleted

```typescript
const signedUrl = await s3.getSignedUrl("getObject", {
  Bucket: "cerniq-exports",
  Key: `exports/${jobId}.xlsx`,
  Expires: 3600,
});
```

---

## 4. Format Selection

| Format | Use Case          | Library / Approach                         |
| ------ | ----------------- | ------------------------------------------ |
| CSV    | Simple, < 50k     | Stream rows, join with comma               |
| Excel  | Formatted, charts | exceljs, xlsx (streaming)                  |
| PDF    | Reports, invoices | python-pdf service (see pdf-generation.md) |

Support `?format=csv|xlsx|pdf` in export endpoint.

---

## 5. Security

- **Auth:** Only authenticated users; export own org data
- **Rate limit:** Max 5 exports per user per hour
- **Data scope:** Respect filters; no full DB dump via API

---

## 6. CSV Encoding and Romanian Characters

- Use UTF-8 with BOM for Excel compatibility: `\uFEFF` at start of stream
- Escape double quotes in fields: `"Acme ""România"" SRL"`
- Romanian diacritics (ă, î, ș, ț) must render correctly; test with sample data

---

## 7. Worker Implementation

```typescript
// Worker: export:leads
async function processExport(job: Job) {
  const { userId, filters, format } = job.data;
  const filePath = `/tmp/cerniq-exports/${job.id}.${format}`;
  const stream = db.select().from(leads).where(buildFilters(filters)).stream();
  const writer = fs.createWriteStream(filePath);
  for await (const row of stream) {
    writer.write(formatRow(row, format) + "\n");
  }
  writer.end();
  await waitForFinish(writer);
  const url = await uploadToS3(filePath, job.id);
  await job.updateData({ ...job.data, downloadUrl: url, status: "ready" });
  fs.unlinkSync(filePath);
}
```

---

## 8. Polling Endpoint

```http
GET /v1/exports/:jobId
Authorization: Bearer <token>
```

Response: `{ status: 'processing' | 'ready' | 'failed', downloadUrl?, error? }`

---

## 9. Excel Streaming (exceljs)

For large Excel files, use streaming writer:

```typescript
const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: writer });
const sheet = workbook.addWorksheet("Leads");
for await (const row of stream) {
  sheet.addRow(row).commit();
}
workbook.commit();
```

---

## 10. Related Documents

- `file-upload.md` — Import flow (inverse of export)
- `pdf-generation.md` — PDF-specific details
- `worker-pool-sizing.md` — Concurrency for export workers

---

## Checklist

- [ ] Streaming for large CSV
- [ ] Background job for Excel/PDF
- [ ] Signed URLs with expiry
- [ ] Format selection (CSV, Excel, PDF)
- [ ] Auth and rate limits
- [ ] UTF-8 BOM for Excel CSV
