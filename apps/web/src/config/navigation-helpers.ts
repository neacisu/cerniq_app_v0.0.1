import { navigation, type NavSection } from "./navigation.js";
import { isAdminLikeRole } from "@/lib/auth-roles.js";

export function getNavigationForRole(role: string | undefined): NavSection[] {
  const admin = isAdminLikeRole(role);
  return navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.requiresAdmin && !admin) return false;
        return true;
      }),
    }))
    .filter((s) => s.items.length > 0);
}
