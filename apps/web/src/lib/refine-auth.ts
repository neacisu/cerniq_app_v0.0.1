/**
 * Aliniat semantic la `ProtectedRoute`: în timpul încărcării sesiunii (`loading` cu token),
 * utilizatorul este tratat ca autentificat în curs de rezolvare (nu „logout” prematur în Refine).
 */
export function refineAuthenticatedFromAuth(auth: { user: unknown; loading: boolean }): boolean {
  if (auth.loading) return true;
  return Boolean(auth.user);
}
