import {
  fetchAdminLogs,
  fetchLiveMetrics,
  getStoredAdminToken,
  getStoredAdminUser,
  loginAdmin,
  logoutAdmin,
} from "./api.js";

describe("web-admin api", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("stores admin session for allowed roles", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            token: "admin-token",
            user: { email: "admin@cerniq.app", role: "admin", name: "Admin" },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const session = await loginAdmin("admin@cerniq.app", "secret");

    expect(session.token).toBe("admin-token");
    expect(getStoredAdminToken()).toBe("admin-token");
    expect(getStoredAdminUser()).toMatchObject({
      email: "admin@cerniq.app",
      role: "admin",
    });
  });

  it("rejects non-admin roles and clears persisted auth", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            token: "member-token",
            user: { email: "user@cerniq.app", role: "member" },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    await expect(loginAdmin("user@cerniq.app", "secret")).rejects.toThrow("Forbidden");
    expect(getStoredAdminToken()).toBeNull();
    expect(getStoredAdminUser()).toBeNull();
  });

  it("uses authenticated admin proxy for live metrics", async () => {
    localStorage.setItem("cerniq_admin_token", "persisted-admin-token");
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { timestamp: 1, queues: [], system: { hostname: "ct109" } },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ) as typeof fetch;

    const response = await fetchLiveMetrics();

    expect(response.success).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/live"),
      expect.objectContaining({
        credentials: "include",
        headers: expect.any(Headers),
      }),
    );

    const headers = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]
      .headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer persisted-admin-token");
  });

  it("fetchAdminLogs folosește proxy-ul autentificat /api/admin/logs", async () => {
    localStorage.setItem("cerniq_admin_token", "persisted-admin-token");
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [{ timestamp: "t", level: "info", message: "x" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    const res = await fetchAdminLogs(100);
    expect(res.success).toBe(true);
    expect(res.data?.length).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/admin\/logs\?limit=100$/),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("clears local auth on logout", async () => {
    localStorage.setItem("cerniq_admin_token", "persisted-admin-token");
    localStorage.setItem(
      "cerniq_admin_user",
      JSON.stringify({ email: "admin@cerniq.app", role: "admin" }),
    );
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    await logoutAdmin();

    expect(getStoredAdminToken()).toBeNull();
    expect(getStoredAdminUser()).toBeNull();
  });
});
