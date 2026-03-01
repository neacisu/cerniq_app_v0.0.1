import { useContext } from "react";
import { AdminAuthContext, type AdminAuthContextValue } from "../providers/admin-auth-context.js";

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
