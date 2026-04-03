/**
 * Maps Refine `resource` names to real `/api/v1/...` paths.
 * Resources may be passed as short names (`products`) or already-prefixed (`v1/products`).
 */
export function resourceToApiPath(resource: string): string {
  const r = resource.replace(/^\/+/, "").replace(/\/+$/, "");
  if (r.startsWith("v1/")) {
    return `/api/${r}`;
  }
  if (r.startsWith("api/v1/")) {
    return r.startsWith("/") ? r : `/${r}`;
  }
  return `/api/v1/${r}`;
}
