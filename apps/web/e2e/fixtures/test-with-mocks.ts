/**
 * Extensie Playwright: instalează mock-urile API înainte de orice navigare pe `page`.
 * Folosiți acest `test` pentru fluxuri autentificate (proiectul `chromium` cu storageState).
 */
import { test as base } from "@playwright/test";
export { expect } from "@playwright/test";
import { installE2eApiMocks } from "./api-mock.ts";

export const test = base.extend({
  page: async ({ page }, continueWithPage) => {
    await installE2eApiMocks(page);
    await continueWithPage(page);
  },
});
