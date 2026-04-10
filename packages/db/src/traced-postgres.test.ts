import { describe, expect, it } from "vitest";
import { templateToRedactedStatement, truncateStatement } from "./traced-postgres.js";

describe("traced-postgres (statement redaction)", () => {
  it("templateToRedactedStatement înlocuiește valorile cu placeholders numerotate", () => {
    const strings = Object.assign(["SELECT * FROM users WHERE id = ", " AND x = ", ""], {
      raw: ["SELECT * FROM users WHERE id = ", " AND x = ", ""],
    }) as TemplateStringsArray;
    const stmt = templateToRedactedStatement(strings);
    expect(stmt).toBe("SELECT * FROM users WHERE id = $1 AND x = $2");
  });

  it("truncateStatement limitează lungimea", () => {
    const long = "a".repeat(3000);
    expect(truncateStatement(long).length).toBeLessThanOrEqual(2002);
    expect(truncateStatement(long).endsWith("…")).toBe(true);
  });
});
