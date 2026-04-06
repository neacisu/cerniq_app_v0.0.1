import { navigation } from "./navigation.js";

/** Toate path-urile din meniul lateral (inclusiv `requiresAdmin`). */
export function getNavigationPathSet(): ReadonlySet<string> {
  return new Set(navigation.flatMap((s) => s.items.map((i) => i.path)));
}

/**
 * Rute din `App.tsx` (sub `ProtectedRoute`) care **nu** au link dedicat în `navigation`.
 * Intenționat: alias URI (`/import` vs `/imports`), rute scurte E2 (`/leads` ↔ `/outreach/leads`),
 * sub-rute CRUD (`/imports/:id`), deep link (`/brain/:batchId`), redirect root (`/`).
 *
 * La adăugarea unei rute noi în App: fie o pui în `navigation`, fie o listezi aici și actualizezi
 * testul `navigation-app-parity.test.tsx`.
 */
export const INTENTIONAL_MENU_ORPHAN_ROUTES: readonly string[] = [
  "/",
  "/imports",
  "/imports/new",
  "/imports/:id",
  "/imports/:id/mapping",
  "/bronze/contacts",
  "/bronze/contacts/:id",
  "/silver/companies",
  "/silver/companies/:id",
  "/silver/contacts",
  "/gold/companies",
  "/gold/companies/:id",
  "/gold/contacts",
  "/approvals/:id",
  "/outreach",
  "/outreach/leads/import",
  "/outreach/leads/:id",
  "/outreach/leads/:id/conversation",
  "/outreach/sequences/new",
  "/outreach/sequences/:id/edit",
  "/outreach/templates/new",
  "/outreach/templates/:id/edit",
  "/outreach/phones/:phoneId",
  "/leads",
  "/sequences",
  "/templates",
  "/phones",
  "/review",
  "/brain/:batchId",
];

export function getIntentionalOrphanPathSet(): ReadonlySet<string> {
  return new Set(INTENTIONAL_MENU_ORPHAN_ROUTES);
}
