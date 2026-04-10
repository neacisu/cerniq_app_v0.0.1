/**
 * Auth context: provider, hook and route guard.
 * We export both the provider and useAuth from this file by design; Fast Refresh
 * is limited for this pattern, so we allow it via eslint.
 */
/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate } from "react-router-dom";
import { api, setOnAuthClearedListener, setOnTokenRefreshedListener } from "@/lib/api.js";
import { LoadingPage } from "@/components/feedback/LoadingPage.js";
import type { User, RegisterData } from "./auth-types.js";

const STORAGE_KEY = "cerniq_token";
const USER_KEY = "cerniq_user";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setAuth: (token: string, user: User) => void;
  getAuthHeader: () => { Authorization?: string };
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadPersistedAuth(): AuthState {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      const user = JSON.parse(userJson) as User;
      return { user, token, loading: true };
    }
    if (token) {
      return { user: null, token, loading: true };
    }
  } catch (err) {
    console.warn("[auth] loadPersistedAuth: invalid stored auth", {
      err: err instanceof Error ? err.message : String(err),
    });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
  }
  return { user: null, token: null, loading: false };
}

function normalizeMeUser(raw: Record<string, unknown>, fallback: User | null): User {
  return {
    id: typeof raw.id === "string" ? raw.id : fallback?.id,
    email: typeof raw.email === "string" ? raw.email : (fallback?.email ?? ""),
    name: typeof raw.name === "string" ? raw.name : fallback?.name,
    tenantId: typeof raw.tenantId === "string" ? raw.tenantId : (fallback?.tenantId ?? ""),
    role: typeof raw.role === "string" ? raw.role : (fallback?.role ?? "viewer"),
  };
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, setState] = useState<AuthState>(loadPersistedAuth);

  /** Sincronizare user/rol/tenant cu serverul după refresh (sursă de adevăr: `/me`, nu doar JSON local). */
  useEffect(() => {
    const token = state.token;
    if (!token) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{
          success?: boolean;
          data?: { user?: Record<string, unknown> };
        }>("/api/v1/auth/me");
        const raw = res?.data?.user;
        if (cancelled || !raw || typeof raw !== "object") {
          if (!cancelled) {
            setState((prev) => ({ ...prev, loading: false }));
          }
          return;
        }
        setState((prev) => {
          if (cancelled || !prev.token) return prev;
          const user = normalizeMeUser(raw, prev.user);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          return { user, token: prev.token, loading: false };
        });
      } catch (err) {
        console.warn("[auth] /me sync failed; clearing session", {
          err: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(USER_KEY);
          setState({ user: null, token: null, loading: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.token]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await api.post<{
        success?: boolean;
        error?: string;
        data?: { token: string; user: User };
      }>("/api/v1/auth/login", { email, password });
      if (!data?.success || !data?.data?.token) {
        return { success: false, error: data?.error ?? "Login failed" };
      }
      const { token, user } = data.data;
      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      setState({ user, token, loading: false });
      return { success: true };
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Network error";
      return { success: false, error: message };
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        mode: data.mode,
        ...(data.mode === "new_company" && data.companyName && { companyName: data.companyName }),
        ...(data.mode === "invite_code" && data.inviteCode && { inviteCode: data.inviteCode }),
      };
      const res = await api.post<{
        success?: boolean;
        error?: string;
        data?: { token: string; user: User };
      }>("/api/v1/auth/register", payload);
      if (!res?.success || !res?.data?.token) {
        return { success: false, error: res?.error ?? "Inregistrare esuata" };
      }
      const { token, user } = res.data;
      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      setState({ user, token, loading: false });
      return { success: true };
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Eroare de retea";
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    void api.post("/api/v1/auth/logout").catch((err) => {
      console.warn("[auth] logout request failed (session cleared locally)", {
        err: err instanceof Error ? err.message : String(err),
      });
    });
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  const setAuth = useCallback((token: string, user: User) => {
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ user, token, loading: false });
  }, []);

  const getAuthHeader = useCallback((): { Authorization?: string } => {
    const token = state.token ?? localStorage.getItem(STORAGE_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [state.token]);

  // Bridge api.ts auth events into React state so ProtectedRoute stays consistent.
  useEffect(() => {
    setOnAuthClearedListener(() => {
      setState({ user: null, token: null, loading: false });
    });
    setOnTokenRefreshedListener((newToken) => {
      setState((prev) => ({ ...prev, token: newToken }));
    });
    return () => {
      setOnAuthClearedListener(null);
      setOnTokenRefreshedListener(null);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loading: Boolean(state.token) && state.loading,
      login,
      register,
      logout,
      setAuth,
      getAuthHeader,
    }),
    [state, login, register, logout, setAuth, getAuthHeader],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function ProtectedRoute({ children }: Readonly<{ children: ReactNode }>) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
