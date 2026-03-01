import { createContext } from "react";

export type AdminAuthContextValue = {
  adminKey: string | null;
  setAdminKey: (key: string | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
