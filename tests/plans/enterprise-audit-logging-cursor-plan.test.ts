import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLAN_REL = "../../docs/developer-guide/plans/enterprise-audit-logging-cursor-plan.yaml";

const ALLOWED_TODO_STATUS = new Set(["pending", "in_progress", "completed", "cancelled"]);

describe("docs/developer-guide/plans/enterprise-audit-logging-cursor-plan.yaml", () => {
  const planPath = path.join(__dirname, PLAN_REL);

  it("există pe disc și se parsează ca YAML fără erori", () => {
    const raw = readFileSync(planPath, "utf-8");
    expect(raw.trimStart().startsWith("---")).toBe(true);
    const doc = YAML.parse(raw) as Record<string, unknown>;
    expect(doc).toBeTruthy();
    expect(typeof doc.name).toBe("string");
    expect((doc.name as string).length).toBeGreaterThan(0);
    expect(typeof doc.overview).toBe("string");
    expect(Array.isArray(doc.todos)).toBe(true);
    expect((doc.todos as unknown[]).length).toBeGreaterThan(0);
    expect(typeof doc.isProject).toBe("boolean");
  });

  it("fiecare intrare todos are id, content, status permis (contract plan Cursor)", () => {
    const raw = readFileSync(planPath, "utf-8");
    const doc = YAML.parse(raw) as { todos: Array<Record<string, unknown>> };
    const ids = new Set<string>();
    for (const t of doc.todos) {
      expect(typeof t.id).toBe("string");
      expect((t.id as string).length).toBeGreaterThan(0);
      expect(ids.has(t.id as string)).toBe(false);
      ids.add(t.id as string);
      expect(typeof t.content).toBe("string");
      expect((t.content as string).length).toBeGreaterThan(0);
      expect(typeof t.status).toBe("string");
      expect(ALLOWED_TODO_STATUS.has(t.status as string)).toBe(true);
    }
  });
});
