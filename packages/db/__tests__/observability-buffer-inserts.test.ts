import { describe, expect, it } from "vitest";
import {
  insertAuditLogRows,
  insertJobLogRows,
  insertErrorLogRows,
} from "../src/observability-buffer-inserts.js";

describe("observability-buffer-inserts", () => {
  it("exportă funcții batch pentru @cerniq/observability", () => {
    expect(typeof insertAuditLogRows).toBe("function");
    expect(typeof insertJobLogRows).toBe("function");
    expect(typeof insertErrorLogRows).toBe("function");
  });
});
