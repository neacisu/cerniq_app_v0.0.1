import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api.js", () => ({
  api: mocks,
}));

import { cerniqDataProvider } from "@/providers/data-provider.js";

describe("cerniqDataProvider", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.patch.mockReset();
    mocks.delete.mockReset();
  });

  it("getList extrage listă din array sau din envelope cu meta.total", async () => {
    mocks.get.mockResolvedValueOnce([{ id: "1" }]);
    const a = await cerniqDataProvider.getList!({
      resource: "products",
      pagination: { currentPage: 2, pageSize: 5 },
    });
    expect(a.data).toHaveLength(1);
    expect(a.total).toBe(1);
    expect(mocks.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/products\?/));

    mocks.get.mockResolvedValueOnce({ data: [{ id: "a" }, { id: "b" }], meta: { total: 99 } });
    const b = await cerniqDataProvider.getList!({ resource: "x" });
    expect(b.total).toBe(99);
  });

  it("getOne normalizează răspunsul", async () => {
    mocks.get.mockResolvedValueOnce({ data: { name: "n" } });
    const r = await cerniqDataProvider.getOne!({ resource: "products", id: "id1" });
    expect(r.data.id).toBe("id1");

    mocks.get.mockResolvedValueOnce({ id: "z" });
    const r2 = await cerniqDataProvider.getOne!({ resource: "products", id: "id2" });
    expect(r2.data.id).toBe("z");
  });

  it("getMany, getManyReference", async () => {
    mocks.get.mockResolvedValueOnce({ data: [{ id: "1" }] });
    const m = await cerniqDataProvider.getMany!({ resource: "r", ids: ["1", "2"] });
    expect(m.data).toHaveLength(1);

    mocks.get.mockResolvedValueOnce({ data: [], meta: { total: 0 } });
    const getManyReference = Reflect.get(cerniqDataProvider, "getManyReference") as (args: {
      resource: string;
    }) => Promise<{ data: unknown[]; total: number }>;
    const ref = await getManyReference({ resource: "r" });
    expect(ref.total).toBe(0);
  });

  it("create, update, deleteOne", async () => {
    mocks.post.mockResolvedValueOnce({ data: { id: "new" } });
    const c = await cerniqDataProvider.create!({ resource: "r", variables: { x: 1 } });
    expect(c.data.id).toBe("new");

    mocks.post.mockResolvedValueOnce({});
    const c2 = await cerniqDataProvider.create!({ resource: "r", variables: {} });
    expect(c2.data).toMatchObject({ id: "" });

    mocks.patch.mockResolvedValueOnce({ data: { id: "u", v: 2 } });
    const u = await cerniqDataProvider.update!({ resource: "r", id: "u", variables: {} });
    expect(u.data.id).toBe("u");

    mocks.delete.mockResolvedValueOnce(undefined);
    const d = await cerniqDataProvider.deleteOne!({ resource: "r", id: "del" });
    expect(d.data.id).toBe("del");
  });

  it("getApiUrl", () => {
    expect(typeof cerniqDataProvider.getApiUrl?.()).toBe("string");
  });
});
