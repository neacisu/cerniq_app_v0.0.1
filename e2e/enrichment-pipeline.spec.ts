import { test, expect } from "@playwright/test";

test.describe("Etapa 1 - Enrichment pipeline UI flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("trigger enrich and promote from Silver", async ({ page }) => {
    await page.route("**/api/v1/silver/companies?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "s1",
              denumire: "Ferma Test SRL",
              cui: "12345678",
              enrichmentStatus: "pending",
              promotionStatus: "eligible",
              totalQualityScore: 82,
            },
          ],
          meta: { total: 1, limit: 50, offset: 0 },
        }),
      });
    });

    await page.route("**/api/v1/silver/companies/s1/enrich", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { id: "s1", queued: true } }),
      });
    });

    await page.route("**/api/v1/silver/companies/s1/promote", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { id: "s1", queued: true } }),
      });
    });

    await page.goto("/silver");
    await expect(page.getByText(/Companii Validate/i)).toBeVisible();
    await expect(page.getByText("Ferma Test SRL")).toBeVisible();

    await page.getByRole("button", { name: /Enrich/i }).click();
    await page.getByRole("button", { name: /Promote/i }).click();
  });
});
