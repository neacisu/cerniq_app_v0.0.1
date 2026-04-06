import type { NavItem, NavSection } from "./navigation.js";

/**
 * Aplică badge-uri pe item-uri după `path`, doar pentru numere > 0 (din API).
 * Elimină `badge` dacă lipsește mapping sau count ≤ 0 — evită numere statice fictive în config.
 */
export function mergeNavBadges(
  sections: NavSection[],
  badgeByPath: Partial<Record<string, { count: number; type: "danger" | "warning" }>>,
): NavSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const spec = badgeByPath[item.path];
      if (spec !== undefined && spec.count > 0) {
        return { ...item, badge: { count: spec.count, type: spec.type } };
      }
      const next: NavItem = { ...item };
      delete next.badge;
      return next;
    }),
  }));
}
