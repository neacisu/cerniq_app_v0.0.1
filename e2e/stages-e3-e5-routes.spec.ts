import { test, expect } from "@playwright/test";

/**
 * Smoke E3–E5 suplimentar față de `@critical` — titluri din `PageWrapper` actuale.
 * Necesită același mediu demo ca `login.spec.ts` / `navigation.spec.ts`.
 */
test.describe("E3–E5 routes smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  });

  test("pagini reprezentative E3, E4, E5 randă titlurile așteptate", async ({ page }) => {
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: /Catalog Produse/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/orders/board");
    await expect(page.getByRole("heading", { name: /Order Dashboard \(Kanban\)/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/referrals");
    await expect(page.getByRole("heading", { name: /Referrals KOL/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
