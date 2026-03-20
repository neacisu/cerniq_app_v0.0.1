import postgres from '/app/node_modules/.pnpm/postgres@3.4.8/node_modules/postgres/src/index.js';
import fs from 'fs';

const env = fs.readFileSync('/secrets/workers.env', 'utf8');
const dburl = env.split('\n').find((line) => line.startsWith('DATABASE_URL='))?.slice('DATABASE_URL='.length);
if (!dburl) throw new Error('DATABASE_URL missing');

const batchId = '32f90cbb-03f9-44ed-9d9a-e950ee4c23f9';
const tenantId = '122a572a-ab53-4436-a49b-2c7e828fb970';
const sql = postgres(dburl);

const [batch] = await sql`
  select metadata, total_rows
  from bronze.bronze_import_batches
  where id = ${batchId}::uuid
`;

if (!batch) throw new Error('Batch not found');

const metadata = batch.metadata ?? {};
const cursor = metadata.identityReprocessCursorLastBronzeId ?? null;
if (!cursor) {
  console.log(JSON.stringify({ batchId, cursor: null, skipped: true }));
  await sql.end();
  process.exit(0);
}

const [stats] = await sql`
  select
    COUNT(*)::int as processed,
    COUNT(*) FILTER (WHERE identity_status = 'resolved')::int as resolved,
    COUNT(*) FILTER (WHERE identity_status = 'duplicate_source')::int as duplicate_source,
    COUNT(*) FILTER (WHERE identity_status = 'identity_conflict')::int as identity_conflict,
    COUNT(*) FILTER (WHERE identity_status = 'insufficient_identifiers')::int as insufficient
  from bronze.bronze_contacts
  where tenant_id = ${tenantId}::uuid
    and COALESCE(jsonb_extract_path_text(metadata, 'batchId'), '') = ${batchId}
    and id <= ${cursor}
`;

await sql`
  update bronze.bronze_import_batches
  set
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(metadata, '{identityReprocessProcessedRows}', to_jsonb(${stats.processed}::int), true),
            '{identityReprocessResolvedRows}', to_jsonb(${stats.resolved}::int), true
          ),
          '{identityReprocessDuplicateSourceRows}', to_jsonb(${stats.duplicate_source}::int), true
        ),
        '{identityReprocessIdentityConflictRows}', to_jsonb(${stats.identity_conflict}::int), true
      ),
      '{identityReprocessInsufficientIdentifierRows}', to_jsonb(${stats.insufficient}::int), true
    ),
    updated_at = now()
  where id = ${batchId}::uuid
`;

console.log(JSON.stringify({ batchId, cursor, stats, totalRows: batch.total_rows }));
await sql.end();
