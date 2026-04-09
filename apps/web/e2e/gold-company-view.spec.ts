import { test, expect } from "./fixtures/test-with-mocks.ts";

test.describe("Gold companie (drawer)", () => {
  test("deschidere din listă → taburi General / Enrichment", async ({ page }) => {
    await page.goto("/gold/companies");
    await expect(page.getByRole("heading", { name: /Gold Leads/i })).toBeVisible();
    await page.getByRole("button", { name: "Companie E2E SA" }).click();
    await expect(page.getByRole("heading", { name: "Companie E2E SA" })).toBeVisible();
    await expect(page.getByText("CUI: RO12345678")).toBeVisible();
    await expect(page.getByRole("tab", { name: "General" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Contact" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Enrichment" })).toBeVisible();
    await page.getByRole("tab", { name: "Enrichment" }).click();
    await expect(page.locator("pre").filter({ hasText: "enrichment" })).toBeVisible();
  });
});
