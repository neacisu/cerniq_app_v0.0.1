import { test, expect } from "@playwright/test";

test.describe("UI publică / login", () => {
  test("pagina /login afișează formularul de autentificare", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Autentificare" })).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Autentificare/i })).toBeVisible();
  });

  test("rute protejate redirecționează spre login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
