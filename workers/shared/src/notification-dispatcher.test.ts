import { describe, it, expect, vi, beforeEach } from "vitest";

const valuesMock = vi.fn().mockResolvedValue(undefined);
const insertMock = vi.fn(() => ({ values: valuesMock }));
const setSessionTenantIdMock = vi.fn().mockResolvedValue(undefined);
const resetSessionContextMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@cerniq/db", () => ({
  db: { insert: insertMock },
  notifications: {},
  setSessionTenantId: setSessionTenantIdMock,
  resetSessionContext: resetSessionContextMock,
  tenants: {},
  users: {},
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn(),
  inArray: vi.fn(),
}));

describe("notification-dispatcher", () => {
  beforeEach(() => {
    valuesMock.mockClear();
    insertMock.mockClear();
    setSessionTenantIdMock.mockClear();
    resetSessionContextMock.mockClear();
  });

  it("exportă dispatchNotification", async () => {
    const mod = await import("./notification-dispatcher.js");
    expect(typeof mod.dispatchNotification).toBe("function");
  });

  it("dispatchNotification — IN_APP apelează insert + session tenant + reset context", async () => {
    const { dispatchNotification } = await import("./notification-dispatcher.js");
    await dispatchNotification({
      tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      type: "SYSTEM",
      title: "T",
      body: "B",
      channels: ["IN_APP"],
    });
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    expect(insertMock).toHaveBeenCalled();
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        channel: "IN_APP",
        type: "SYSTEM",
        title: "T",
        body: "B",
      }),
    );
    expect(resetSessionContextMock).toHaveBeenCalled();
  });
});
