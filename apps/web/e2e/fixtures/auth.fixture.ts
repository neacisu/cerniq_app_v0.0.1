import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";
import { E2E_EMAIL, E2E_PASSWORD, installE2eApiMocks } from "./api-mock.ts";

const webRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

/** Cale absolută — aceeași în `playwright.config.ts` (storageState) și la salvare în setup. */
export const AUTH_STORAGE_ABS = path.join(webRoot, "playwright", ".auth", "user.json");

/** Login prin UI cu mock API (fără backend); acoperă dashboard + sidebar după autentificare. */
export async function loginWithMockedApi(page: Page): Promise<void> {
  await installE2eApiMocks(page);
  await page.goto("/login");
  await page.locator("#email").fill(E2E_EMAIL);
  await page.locator("#password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /Autentificare/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

/**
 * Pattern Playwright `storageState`: persistă cookie-uri + `localStorage` după login mock.
 * Rulați din `e2e/auth.setup.ts` (proiect `setup`) înainte de suite-ul `chromium`.
 */
export async function saveAuthenticatedStorageState(page: Page): Promise<void> {
  await loginWithMockedApi(page);
  fs.mkdirSync(path.dirname(AUTH_STORAGE_ABS), { recursive: true });
  await page.context().storageState({ path: AUTH_STORAGE_ABS });
}

/** Login prin UI folosind variabile de mediu (staging / CI cu secret). */
export async function loginWithEnvCredentials(page: Page): Promise<void> {
  const email = process.env.E2E_LOGIN_EMAIL ?? "";
  const password = process.env.E2E_LOGIN_PASSWORD ?? "";
  if (!email || !password) {
    throw new Error("E2E_LOGIN_EMAIL și E2E_LOGIN_PASSWORD sunt obligatorii");
  }
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /Autentificare/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}
