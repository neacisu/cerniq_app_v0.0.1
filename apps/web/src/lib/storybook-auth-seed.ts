/**
 * Seed sincron pentru Storybook: înainte de primul mount al AuthProvider,
 * astfel încât loadPersistedAuth() vede token + user și ProtectedRoute nu redirecționează la /login.
 */
const STORAGE_KEY = "cerniq_token";
const USER_KEY = "cerniq_user";

const SB_TOKEN = "storybook.jwt.placeholder";
const SB_USER_JSON = JSON.stringify({
  id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  email: "storybook@cerniq.app",
  name: "Storybook User",
  tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  role: "admin",
});

export function seedStorybookAuth(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, SB_TOKEN);
  localStorage.setItem(USER_KEY, SB_USER_JSON);
}
