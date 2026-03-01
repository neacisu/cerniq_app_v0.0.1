import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { Queue } from "bullmq";
import { bronzeContacts, bronzeImportBatches, db, setSessionTenantId, sql } from "@cerniq/db";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";
import { z } from "zod";
import { getActorId, parseLimit, parseOffset, requireTenantId } from "./utils.js";
import { importConfigSchema, listBronzeContactsSchema } from "../schemas/etapa1.js";

const IMPORT_DIR = process.env.IMPORT_UPLOAD_DIR || "/tmp/cerniq-imports";
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const importStatusSchema = z.enum(["pending", "processing", "completed", "failed", "cancelled"]);
const sourceTypeSchema = z.enum([
  "csv_import",
  "webhook",
  "scrape",
  "manual",
  "api",
  "excel_import",
]);
const idParamsSchema = z.object({ id: z.string().uuid() });
const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});
const successListResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.record(z.string(), z.unknown())),
  meta: z
    .object({
      total: z.number().int().nonnegative(),
      limit: z.number().int().positive(),
      offset: z.number().int().nonnegative(),
    })
    .optional(),
});
const successObjectResponseSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
});
const reprocessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({ id: z.string().uuid(), requeued: z.boolean() }),
});
function readFieldValue(
  fields: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  const raw = fields?.[name] as { value?: unknown } | undefined;
  if (raw && typeof raw === "object" && "value" in raw && typeof raw.value === "string") {
    return raw.value;
  }
  return undefined;
}

export async function importsBronzeRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  app.get(
    "/imports",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "List import batches",
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(100).optional(),
          offset: z.coerce.number().int().min(0).optional(),
          status: importStatusSchema.optional(),
          sourceType: sourceTypeSchema.optional(),
          dateFrom: z.coerce.date().optional(),
          dateTo: z.coerce.date().optional(),
          sortBy: z.enum(["createdAt", "updatedAt"]).optional(),
          sortDir: z.enum(["asc", "desc"]).optional(),
        }),
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(100).optional(),
        offset: z.coerce.number().int().min(0).optional(),
        status: importStatusSchema.optional(),
        sourceType: sourceTypeSchema.optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
        sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
      });
      const parsed = querySchema.safeParse(request.query);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: parsed.error.issues });
      const q = parsed.data;
      const limit = parseLimit(q.limit, 25);
      const offset = parseOffset(q.offset, 0);
      const orderSql =
        q.sortBy === "updatedAt"
          ? q.sortDir === "asc"
            ? sql`${bronzeImportBatches.updatedAt} ASC`
            : sql`${bronzeImportBatches.updatedAt} DESC`
          : q.sortDir === "asc"
            ? sql`${bronzeImportBatches.createdAt} ASC`
            : sql`${bronzeImportBatches.createdAt} DESC`;

      const filters = [sql`${bronzeImportBatches.tenantId} = ${tenantId}`];
      if (q.status) filters.push(sql`${bronzeImportBatches.status} = ${q.status}`);
      if (q.sourceType)
        filters.push(
          sql`COALESCE(${bronzeImportBatches.metadata}->>'sourceType', '') = ${q.sourceType}`,
        );
      if (q.dateFrom) filters.push(sql`${bronzeImportBatches.createdAt} >= ${q.dateFrom}`);
      if (q.dateTo) filters.push(sql`${bronzeImportBatches.createdAt} <= ${q.dateTo}`);
      const whereSql = sql.join(filters, sql` AND `);

      const [rows, total] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        const resultRows = await tx.query.bronzeImportBatches.findMany({
          where: whereSql,
          orderBy: () => [orderSql],
          limit,
          offset,
        });
        const [{ total: totalCount }] = await tx
          .select({ total: sql<number>`COUNT(*)` })
          .from(bronzeImportBatches)
          .where(whereSql);
        return [resultRows, Number(totalCount)] as const;
      });

      return { success: true, data: rows, meta: { total, limit, offset } };
    },
  );

  app.get(
    "/imports/:id",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Get import batch detail",
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const row = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!row) return reply.code(404).send({ success: false, error: "Import batch not found" });
      return { success: true, data: row };
    },
  );

  app.post(
    "/imports",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Upload and enqueue import batch",
        response: {
          201: successObjectResponseSchema,
          400: errorResponseSchema,
          413: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const actorId = getActorId(request);
      await setSessionTenantId(tenantId);

      const part = await request.file({
        limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      });
      if (!part) return reply.code(400).send({ success: false, error: "Fisier lipsa" });

      const ext = extname(part.filename).toLowerCase();
      const isCsv = ext === ".csv" || part.mimetype === "text/csv";
      const isExcel =
        ext === ".xlsx" ||
        ext === ".xls" ||
        part.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        part.mimetype === "application/vnd.ms-excel";
      if (!isCsv && !isExcel) {
        return reply
          .code(400)
          .send({ success: false, error: "Format neacceptat. Foloseste CSV sau Excel." });
      }

      const bytes = await part.toBuffer();
      if (bytes.length > MAX_UPLOAD_BYTES) {
        return reply.code(413).send({ success: false, error: "Fisierul depaseste 100MB" });
      }

      const rawMapping = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "mapping",
      );
      const rawHasHeader = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "hasHeader",
      );
      const rawEncoding = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "encoding",
      );
      const rawDelimiter = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "delimiter",
      );
      const rawSheetName = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "sheetName",
      );
      const rawSourceType = readFieldValue(
        part.fields as Record<string, unknown> | undefined,
        "sourceType",
      );

      const mappingParsed =
        rawMapping && rawMapping.trim().length > 0
          ? (() => {
              try {
                const parsed = JSON.parse(rawMapping) as unknown;
                if (!parsed || typeof parsed !== "object") return undefined;
                return parsed as Record<string, string>;
              } catch {
                return undefined;
              }
            })()
          : undefined;

      const parsedConfig = importConfigSchema.safeParse({
        mapping: mappingParsed,
        hasHeader: rawHasHeader ? rawHasHeader === "true" : true,
        encoding: rawEncoding ?? "utf-8",
        delimiter: rawDelimiter,
        sheetName: rawSheetName,
        sourceType: rawSourceType ?? (isExcel ? "excel_import" : "csv_import"),
      });
      if (!parsedConfig.success) {
        return reply.code(400).send({
          success: false,
          error: "Config upload invalid",
          details: parsedConfig.error.issues,
        });
      }
      const uploadConfig = parsedConfig.data;

      await mkdir(IMPORT_DIR, { recursive: true });
      const storedPath = `${IMPORT_DIR}/${randomUUID()}-${part.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await writeFile(storedPath, bytes);

      const [batch] = await db
        .insert(bronzeImportBatches)
        .values({
          tenantId,
          filename: part.filename,
          fileSizeBytes: bytes.length,
          status: "pending",
          importedBy: actorId,
          metadata: {
            mimetype: part.mimetype,
            storedPath,
            uploadConfig: {
              hasHeader: uploadConfig.hasHeader,
              encoding: uploadConfig.encoding,
              delimiter: uploadConfig.delimiter ?? null,
              sheetName: uploadConfig.sheetName ?? null,
              mapping: uploadConfig.mapping ?? null,
              sourceType: uploadConfig.sourceType,
            },
          },
        })
        .returning();

      const connection = getRedisConnectionOptions();
      const prefix = getQueuePrefix();
      const queueName = isCsv ? "bronze:ingest:csv-parser" : "bronze:ingest:excel-parser";
      const queue = new Queue(queueName, { connection, prefix });
      await queue.add("ingest", {
        tenantId,
        batchId: batch.id,
        filePath: storedPath,
        fileName: part.filename,
        fileSize: bytes.length,
        hasHeader: uploadConfig.hasHeader,
        encoding: uploadConfig.encoding,
        delimiter: uploadConfig.delimiter,
        sheetName: uploadConfig.sheetName,
        mapping: uploadConfig.mapping,
        correlationId: `import-${batch.id}`,
      });
      await queue.close();

      return reply.code(201).send({ success: true, data: batch });
    },
  );

  app.post(
    "/imports/:id/cancel",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-imports"],
        summary: "Cancel active import batch",
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const existing = await db.query.bronzeImportBatches.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!existing)
        return reply.code(404).send({ success: false, error: "Import batch not found" });
      if (!["pending", "processing"].includes(existing.status)) {
        return reply
          .code(409)
          .send({ success: false, error: "Doar importurile active pot fi anulate" });
      }

      const [updated] = await db
        .update(bronzeImportBatches)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(sql`${bronzeImportBatches.id} = ${parsed.data.id}`)
        .returning();
      return { success: true, data: updated };
    },
  );

  app.get(
    "/bronze/contacts",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-bronze"],
        summary: "List bronze contacts",
        querystring: listBronzeContactsSchema,
        response: {
          200: successListResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = listBronzeContactsSchema.safeParse(request.query);
      if (!parsed.success)
        return reply
          .code(400)
          .send({ success: false, error: "Query invalida", details: parsed.error.issues });
      const q = parsed.data;
      const limit = parseLimit(q.limit, 25);
      const offset = parseOffset(q.offset, 0);

      const conditions = [sql`${bronzeContacts.tenantId} = ${tenantId}`];
      if (q.status) conditions.push(sql`${bronzeContacts.processingStatus} = ${q.status}`);
      if (q.sourceType) conditions.push(sql`${bronzeContacts.sourceType} = ${q.sourceType}`);
      if (q.search) {
        conditions.push(
          sql`(COALESCE(${bronzeContacts.extractedCui}, '') ILIKE ${`%${q.search}%`} OR COALESCE(${bronzeContacts.extractedName}, '') ILIKE ${`%${q.search}%`} OR COALESCE(${bronzeContacts.extractedEmail}, '') ILIKE ${`%${q.search}%`})`,
        );
      }
      if (q.batchId) {
        conditions.push(sql`COALESCE(${bronzeContacts.metadata}->>'batchId', '') = ${q.batchId}`);
      }
      if (q.dateFrom) conditions.push(sql`${bronzeContacts.createdAt} >= ${q.dateFrom}`);
      if (q.dateTo) conditions.push(sql`${bronzeContacts.createdAt} <= ${q.dateTo}`);

      const sortColumn =
        q.sortBy === "updatedAt" ? bronzeContacts.updatedAt : bronzeContacts.createdAt;
      const sortOrder = q.sortDir === "asc" ? sql`${sortColumn} ASC` : sql`${sortColumn} DESC`;
      const whereSql = sql.join(conditions, sql` AND `);

      const [rows, total] = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        const resultRows = await tx.query.bronzeContacts.findMany({
          where: whereSql,
          orderBy: () => [sortOrder],
          limit,
          offset,
        });
        const [countRow] = await tx
          .select({ total: sql<number>`COUNT(*)` })
          .from(bronzeContacts)
          .where(whereSql);
        return [resultRows, Number(countRow?.total ?? 0)] as const;
      });

      return { success: true, data: rows, meta: { total, limit, offset } };
    },
  );

  app.get(
    "/bronze/contacts/:id",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-bronze"],
        summary: "Get bronze contact detail",
        params: idParamsSchema,
        response: {
          200: successObjectResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });
      const row = await db.query.bronzeContacts.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!row) return reply.code(404).send({ success: false, error: "Bronze contact not found" });
      return { success: true, data: row };
    },
  );

  app.post(
    "/bronze/contacts/:id/reprocess",
    {
      ...authOpts,
      schema: {
        tags: ["etapa1-bronze"],
        summary: "Requeue bronze contact for processing",
        params: idParamsSchema,
        response: {
          200: reprocessResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const parsed = idParamsSchema.safeParse(request.params);
      if (!parsed.success)
        return reply.code(400).send({ success: false, error: "Parametru id invalid" });

      const contact = await db.query.bronzeContacts.findFirst({
        where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, parsed.data.id)),
      });
      if (!contact)
        return reply.code(404).send({ success: false, error: "Bronze contact not found" });

      const connection = getRedisConnectionOptions();
      const prefix = getQueuePrefix();
      const queue = new Queue("pipeline:promote-bronze-silver", { connection, prefix });
      await queue.add("reprocess", {
        tenantId,
        bronzeContactId: contact.id,
        correlationId: `reprocess-${contact.id}`,
      });
      await queue.close();

      await db
        .update(bronzeContacts)
        .set({ processingStatus: "pending", doNotProcess: false, updatedAt: new Date() })
        .where(sql`${bronzeContacts.id} = ${contact.id}`);

      return { success: true, data: { id: contact.id, requeued: true } };
    },
  );
}
