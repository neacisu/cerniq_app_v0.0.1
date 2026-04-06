import { test, expect } from "@playwright/test";
import { getNavigationForRole } from "../apps/web/src/config/navigation-helpers.js";

/** Caractere speciale regex — evită `\\$&` în replacement (Sonar S7780). */
function escapeRegExpPath(path: string): string {
  return path.replaceAll(/[.*+?^${}()|[\]\\]/g, (ch) => "\\" + ch);
}

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  /**
   * Aliniat la `navigation.ts` + `getNavigationForRole` — evită regex-uri ambigue
   * (ex. mai multe „Dashboard”) și rute învechite față de `App.tsx`.
   */
  test("sidebar: fiecare item admin din config ajunge la path-ul declarat", async ({ page }) => {
    const nav = getNavigationForRole("admin");
    for (const section of nav) {
      for (const item of section.items) {
        const link = page.getByRole("link", { name: item.label, exact: true });
        await expect(link.first()).toBeVisible({ timeout: 12_000 });
        await link.first().click();
        const pathSuffix = String.raw`(\/|\?.*|$)`;
        const pathRe = new RegExp(escapeRegExpPath(item.path) + pathSuffix);
        await expect(page).toHaveURL(pathRe, { timeout: 20_000 });
      }
    }
  });

  test("skip link focuses main content", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /sari la conținut/i });
    await expect(skipLink).toBeFocused();
    await skipLink.click();
    await expect(page.locator("#main-content")).toBeFocused();
  });
});
