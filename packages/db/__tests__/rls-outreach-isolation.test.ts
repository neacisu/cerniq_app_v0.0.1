import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SQL_DIR = join(__dirname, "..", "drizzle");

function readSqlFile(name: string): string {
  const path = join(SQL_DIR, name);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

describe("RLS outreach schema (0064)", () => {
  const sql = readSqlFile("0064_outreach_rls_policies.sql");

  it("fișierul de migrație există și nu e gol", () => {
    expect(sql.length).toBeGreaterThan(100);
  });

  it("activează RLS pe tabele critice outreach", () => {
    expect(sql).toContain("outreach.communication_log ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("outreach.wa_phone_numbers ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("outreach.outreach_settings ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("outreach.outreach_sequences ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("outreach.sequence_enrollments ENABLE ROW LEVEL SECURITY");
  });

  it("folosește public.cerniq_app_session_tenant_id() pentru izolare", () => {
    expect(sql).toContain("public.cerniq_app_session_tenant_id()");
  });

  it("include politici pentru tabele fără tenant_id direct (join)", () => {
    expect(sql).toContain("outreach.wa_quota_usage");
    expect(sql).toContain("outreach.outreach_sequence_steps");
    expect(sql).toContain("outreach.template_versions");
  });

  it("include SMS și webhook archive", () => {
    expect(sql).toContain("outreach.sms_messages");
    expect(sql).toContain("outreach.webhook_event_archive");
  });
});
