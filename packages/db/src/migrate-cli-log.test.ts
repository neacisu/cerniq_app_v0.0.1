import { describe, expect, it, vi } from "vitest";
import { migrateCliLog } from "./migrate-cli-log.js";

describe("migrateCliLog", () => {
  it("scrie o linie JSON pe stderr cu service db-migrate-cli", () => {
    const chunks: string[] = [];
    const spy = vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    });
    migrateCliLog({ level: "info", event: "test_event", x: 1 });
    spy.mockRestore();
    expect(chunks).toHaveLength(1);
    const line = chunks[0];
    if (line === undefined) {
      expect.fail("expected exactly one stderr chunk");
    }
    expect(JSON.parse(line)).toEqual(
      expect.objectContaining({
        service: "db-migrate-cli",
        event: "test_event",
        x: 1,
      }),
    );
  });
});
