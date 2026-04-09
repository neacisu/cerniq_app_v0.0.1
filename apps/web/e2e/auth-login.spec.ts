import { test, expect } from "@playwright/test";
import { installE2eApiMocks, E2E_EMAIL, E2E_PASSWORD } from "./fixtures/api-mock.ts";

test.describe("Login cu mock API (CI)", () => {
  test("submit login → dashboard, sidebar și profil", async ({ page }) => {
    await installE2eApiMocks(page);
    await page.goto("/login");
    await page.locator("#email").fill(E2E_EMAIL);
    await page.locator("#password").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: /Autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Leads" })).toBeVisible();
    await expect(page.getByLabel("Utilizator E2E")).toBeVisible();
  });
});

test.describe("Login cu API live (opțional)", () => {
  const email = process.env.E2E_LOGIN_EMAIL ?? "";
  const password = process.env.E2E_LOGIN_PASSWORD ?? "";

  test.skip(!email || !password, "Setează E2E_LOGIN_EMAIL și E2E_LOGIN_PASSWORD pentru API live.");

  test("submit login → dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /Autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });
});
