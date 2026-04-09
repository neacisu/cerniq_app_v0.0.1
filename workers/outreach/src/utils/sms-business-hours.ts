/**
 * Fereastră business pentru SMS — folosește `outreach_settings` (timezone, work_days, ore).
 * Sărbători RO: aceeași listă ca `resilience.ts` (ADR-0056).
 */
import { DateTime } from "luxon";
import { ROMANIAN_HOLIDAYS_2026 } from "../workers/resilience.js";

export type OutreachSettingsRow = {
  businessHoursStart: number;
  businessHoursEnd: number;
  workDays: number[];
  timezone: string;
};

export function isSmsSendAllowedByTenantSettings(
  settings: OutreachSettingsRow,
  now = new Date(),
): boolean {
  const zone = settings.timezone?.trim() || "Europe/Bucharest";
  const dt = DateTime.fromJSDate(now).setZone(zone);
  const iso = dt.toISODate();
  if (iso === null) return false;
  if (ROMANIAN_HOLIDAYS_2026.includes(iso)) return false;

  const wd = dt.weekday;
  const days = Array.isArray(settings.workDays) ? settings.workDays : [1, 2, 3, 4, 5];
  if (!days.includes(wd)) return false;

  const h = dt.hour;
  return h >= settings.businessHoursStart && h < settings.businessHoursEnd;
}
