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

  test("full pipeline flow: import -> bronze -> silver -> gold", async ({ page }) => {
    // Mock Import upload
    await page.route("**/api/v1/imports", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "imp1", status: "processing", totalRows: 5 },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: [
              { id: "imp1", status: "completed", sourceType: "csv", totalRows: 5, successRows: 5 },
            ],
            meta: { total: 1 },
          }),
        });
      }
    });

    // Mock Bronze contacts
    await page.route("**/api/v1/bronze/contacts?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "b1",
              extractedName: "Agro Test SRL",
              extractedCui: "98765432",
              processingStatus: "pending",
            },
          ],
          meta: { total: 1 },
        }),
      });
    });

    // Mock Silver companies
    await page.route("**/api/v1/silver/companies?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "s2",
              denumire: "Agro Test SRL",
              cui: "98765432",
              enrichmentStatus: "complete",
              promotionStatus: "eligible",
              totalQualityScore: 88,
            },
          ],
          meta: { total: 1 },
        }),
      });
    });

    // Mock Gold companies
    await page.route("**/api/v1/gold/companies?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "g1",
              denumire: "Agro Test SRL",
              cui: "98765432",
              currentState: "qualified",
              leadScore: 78,
            },
          ],
          meta: { total: 1 },
        }),
      });
    });

    // Navigate through all layers
    await page.goto("/bronze");
    await expect(page.getByText("Agro Test SRL")).toBeVisible();

    await page.goto("/silver");
    await expect(page.getByText("Agro Test SRL")).toBeVisible();

    await page.goto("/gold");
    await expect(page.getByText("Agro Test SRL")).toBeVisible();
  });

  test("Silver filters work correctly", async ({ page }) => {
    await page.route("**/api/v1/silver/companies?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [],
          meta: { total: 0 },
        }),
      });
    });

    await page.goto("/silver");
    await expect(page.getByText(/Companii Validate/i)).toBeVisible();

    await page.getByRole("button", { name: /Filtre/i }).click();
    await expect(page.getByText(/Status Enrichment/i)).toBeVisible();
    await expect(page.getByText(/Status Promovare/i)).toBeVisible();
  });

  test("Gold filters work correctly", async ({ page }) => {
    await page.route("**/api/v1/gold/companies?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
      });
    });

    await page.goto("/gold");
    await page.getByRole("button", { name: /Filtre/i }).click();
    await expect(page.getByText(/Stare Lead/i)).toBeVisible();
    await expect(page.getByText(/Județ/i)).toBeVisible();
  });
});
