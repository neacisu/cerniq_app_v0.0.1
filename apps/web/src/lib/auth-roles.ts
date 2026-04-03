/** Roles that may access admin queue / worker operations in the main SPA (align with API `requireAdminOrOwner`). */
const ADMIN_LIKE = new Set(["admin", "owner", "superadmin"]);

export function isAdminLikeRole(role: string | undefined): boolean {
  if (!role) return false;
  return ADMIN_LIKE.has(role.toLowerCase());
}
