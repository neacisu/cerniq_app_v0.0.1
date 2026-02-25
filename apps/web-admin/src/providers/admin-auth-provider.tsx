import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "cerniq_admin_key";

type AdminAuthContextValue = {
  adminKey: string | null;
  setAdminKey: (key: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminKey, setAdminKeyState] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null,
  );

  const setAdminKey = useCallback((key: string | null) => {
    if (typeof window !== "undefined") {
      if (key) localStorage.setItem(STORAGE_KEY, key);
      else localStorage.removeItem(STORAGE_KEY);
    }
    setAdminKeyState(key);
  }, []);

  const logout = useCallback(() => {
    setAdminKey(null);
  }, [setAdminKey]);

  const value: AdminAuthContextValue = {
    adminKey,
    setAdminKey,
    logout,
    isAuthenticated: Boolean(adminKey?.trim()),
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
