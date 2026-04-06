/**
 * Inițiale afișabile din profilul utilizatorului (sursă: GET /api/v1/auth/me → `useAuth().user`).
 */
export function userAvatarInitials(
  user: {
    name?: string | null;
    email?: string | null;
  } | null,
): string {
  if (!user) return "?";
  const name = user.name?.trim();
  const email = user.email?.trim();
  const base = name || email;
  if (!base) return "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}
