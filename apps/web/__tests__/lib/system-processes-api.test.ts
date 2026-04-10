import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/api.js", () => ({
  api: { get: mocks.get },
}));

import { fetchSystemProcesses } from "@/lib/system-processes-api.js";

describe("system-processes-api", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.get.mockResolvedValue({
      success: true,
      data: { processes: [], activeCount: 0, queuesReachable: true },
    });
  });

  it("fetchSystemProcesses apelează GET /api/v1/system/processes", async () => {
    await fetchSystemProcesses();
    expect(mocks.get).toHaveBeenCalledWith("/api/v1/system/processes");
  });
});
