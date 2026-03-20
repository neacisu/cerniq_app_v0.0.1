import { useCallback, useState, type ReactNode } from "react";
import { AdminAuthContext, type AdminAuthContextValue } from "./admin-auth-context.js";
import { getStoredAdminToken, getStoredAdminUser, loginAdmin, logoutAdmin } from "../api.js";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredAdminToken());
  const [user, setUser] = useState<AdminAuthContextValue["user"]>(() => getStoredAdminUser());

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginAdmin(email, password);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    await logoutAdmin();
    setToken(null);
    setUser(null);
  }, []);

  const value: AdminAuthContextValue = {
    token,
    user,
    login,
    logout,
    isAuthenticated: Boolean(token?.trim()),
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
