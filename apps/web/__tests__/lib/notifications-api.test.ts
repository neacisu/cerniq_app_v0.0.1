import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api.js", () => ({
  api: { get: mocks.get, patch: mocks.patch, post: mocks.post },
}));

import {
  fetchAppNotifications,
  markAppNotificationRead,
  markAllAppNotificationsRead,
} from "@/lib/notifications-api.js";

describe("notifications-api", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.patch.mockReset();
    mocks.post.mockReset();
    mocks.get.mockResolvedValue({ success: true, data: { items: [], unreadCount: 0 } });
    mocks.patch.mockResolvedValue(undefined);
    mocks.post.mockResolvedValue(undefined);
  });

  it("fetchAppNotifications construiește query-ul (limit + opțional unread)", async () => {
    await fetchAppNotifications();
    expect(mocks.get).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/notifications\?/));
    expect(mocks.get.mock.calls[0][0]).toContain("limit=50");
    expect(mocks.get.mock.calls[0][0]).not.toContain("unread=true");

    await fetchAppNotifications(true);
    expect(mocks.get.mock.calls[1][0]).toContain("unread=true");
  });

  it("markAppNotificationRead și markAllAppNotificationsRead apelează PATCH/POST", async () => {
    await markAppNotificationRead("n1");
    expect(mocks.patch).toHaveBeenCalledWith("/api/v1/notifications/n1/read", {});

    await markAllAppNotificationsRead();
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/notifications/read-all", {});
  });
});
