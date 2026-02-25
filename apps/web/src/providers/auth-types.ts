/**
 * Auth-related types. Extracted so the auth provider file can satisfy
 * react-refresh/only-export-components (only components exported from provider file).
 */

export type User = {
  id?: string;
  email: string;
  name?: string;
  tenantId: string;
  role: string;
};

export type RegisterData = {
  name: string;
  email: string;
  password: string;
  mode: "new_company" | "invite_code";
  companyName?: string;
  inviteCode?: string;
};
