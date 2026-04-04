/**
 * Contract HTTP pentru workers-fetch: path-uri stabile și encodeURIComponent pe nume coadă.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api.js", () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import {
  fetchAdminLive,
  fetchApiPluginPrometheusCatalog,
  fetchQueueDetail,
  postQueueControl,
} from "@/pages/system/workers-fetch.js";

describe("workers-fetch", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getMock.mockResolvedValue({ success: true });
    postMock.mockResolvedValue({ success: true });
  });

  it("fetchAdminLive apelează GET /api/admin/live", async () => {
    await fetchAdminLive();
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith("/api/admin/live");
  });

  it("fetchQueueDetail encodează numele cozii în path", async () => {
    await fetchQueueDetail("ingest:csv");
    expect(getMock).toHaveBeenCalledWith("/api/admin/queues/ingest%3Acsv");
  });

  it("postQueueControl construiește path-ul pause corect", async () => {
    await postQueueControl("q1", "pause");
    expect(postMock).toHaveBeenCalledWith("/api/admin/queues/q1/pause");
  });

  it("postQueueControl encodează nume cu caractere speciale", async () => {
    await postQueueControl("a/b", "drain");
    expect(postMock).toHaveBeenCalledWith("/api/admin/queues/a%2Fb/drain");
  });

  it("fetchApiPluginPrometheusCatalog apelează GET /api/admin/prometheus/api-plugin-catalog", async () => {
    await fetchApiPluginPrometheusCatalog();
    expect(getMock).toHaveBeenCalledWith("/api/admin/prometheus/api-plugin-catalog");
  });
});
