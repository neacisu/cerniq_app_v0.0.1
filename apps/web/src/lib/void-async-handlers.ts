/**
 * Handler pentru `.catch` pe promisiuni fire-and-forget (invalidate/refetch/mutate).
 * Fără `reportClientError` — evită zgomot; erorile API rămân în `apiFetch` / Query onError.
 * @see ADR-0108 §21
 */
export function voidAsyncHandler(_reason: unknown): void {
  /* intentional no-op */
}
