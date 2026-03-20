import { createContext } from "react";

export type AdminAuthContextValue = {
  token: string | null;
  user: { email?: string; name?: string; role?: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
