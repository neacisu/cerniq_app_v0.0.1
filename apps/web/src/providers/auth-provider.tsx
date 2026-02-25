import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/lib/api.js";
import { LoadingPage } from "@/components/feedback/LoadingPage.js";

const STORAGE_KEY = "cerniq_token";
const USER_KEY = "cerniq_user";

export type User = {
  id?: string;
  email: string;
  name?: string;
  tenantId: string;
  role: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
      return { user, token, loading: false };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
  }
  return { user: null, token: null, loading: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadPersistedAuth);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await api.post<{
        success?: boolean;
        error?: string;
        data?: { token: string; user: User };
      }>("/auth/login", { email, password });
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

  const logout = useCallback(() => {
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

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      setAuth,
      getAuthHeader,
    }),
    [state, login, logout, setAuth, getAuthHeader],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
