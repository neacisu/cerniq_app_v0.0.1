import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockValues, mockInsert } = vi.hoisted(() => {
  const mockValues = vi.fn().mockResolvedValue(undefined);
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });
  return { mockValues, mockInsert };
});

vi.mock("../src/client.js", () => ({
  db: { insert: mockInsert },
}));

import {
  insertAuditLogRows,
  insertErrorLogRows,
  insertJobLogRows,
} from "../src/observability-buffer-inserts.js";

describe("observability-buffer-inserts", () => {
  beforeEach(() => {
    mockValues.mockClear();
    mockInsert.mockClear();
    mockInsert.mockReturnValue({ values: mockValues });
  });

  it("nu apelează insert pentru liste goale", async () => {
    await insertAuditLogRows([]);
    await insertJobLogRows([]);
    await insertErrorLogRows([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("propagă insert batch pentru audit, job și error logs", async () => {
    await insertAuditLogRows([{ tenantId: "t", action: "a" } as never]);
    await insertJobLogRows([{ tenantId: "t", jobId: "j" } as never]);
    await insertErrorLogRows([{ tenantId: "t", message: "m" } as never]);
    expect(mockInsert).toHaveBeenCalledTimes(3);
    expect(mockValues).toHaveBeenCalledTimes(3);
  });
});
