/**
 * AuthProvider: login, register, logout, setAuth, getAuthHeader — api parțial mock-uit.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/providers/auth-provider.js";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/lib/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api.js")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get,
      post,
    },
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const user = {
  id: "u1",
  email: "a@b.c",
  name: "N",
  tenantId: "ten",
  role: "admin",
};

describe("AuthProvider — acțiuni", () => {
  beforeEach(() => {
    localStorage.clear();
    post.mockReset();
    get.mockReset();
  });

  it("login reușit", async () => {
    post.mockResolvedValueOnce({ success: true, data: { token: "t1", user } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const r = await result.current.login("a@b.c", "pw");
      expect(r.success).toBe(true);
    });
    expect(localStorage.getItem("cerniq_token")).toBe("t1");
  });

  it("login eșuat", async () => {
    post.mockResolvedValueOnce({ success: false, error: "bad" });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const r = await result.current.login("x@y.z", "pw");
      expect(r.success).toBe(false);
    });
  });

  it("register new_company", async () => {
    post.mockResolvedValueOnce({
      success: true,
      data: { token: "t2", user: { ...user, id: "u2", email: "e@e.e", role: "viewer" } },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.register({
        name: "N",
        email: "e@e.e",
        password: "p",
        mode: "new_company",
        companyName: "Co",
      });
    });
    expect(post).toHaveBeenCalledWith(
      "/api/v1/auth/register",
      expect.objectContaining({ companyName: "Co" }),
    );
  });

  it("register invite_code", async () => {
    post.mockResolvedValueOnce({
      success: true,
      data: { token: "t3", user: { ...user, email: "z@z.z" } },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.register({
        name: "N",
        email: "z@z.z",
        password: "p",
        mode: "invite_code",
        inviteCode: "ABC",
      });
    });
    expect(post).toHaveBeenCalledWith(
      "/api/v1/auth/register",
      expect.objectContaining({ inviteCode: "ABC", mode: "invite_code" }),
    );
  });

  it("logout", async () => {
    post.mockResolvedValueOnce({ success: true, data: { token: "x", user } });
    post.mockResolvedValueOnce({});
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("a@b.c", "pw");
    });
    await act(async () => {
      result.current.logout();
    });
    expect(localStorage.getItem("cerniq_token")).toBeNull();
  });

  it("setAuth și getAuthHeader", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      result.current.setAuth("tok3", {
        email: "m@m.m",
        tenantId: "t",
        role: "viewer",
      });
    });
    expect(result.current.getAuthHeader()).toEqual({ Authorization: "Bearer tok3" });
  });
});
