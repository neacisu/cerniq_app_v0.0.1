import { test, expect } from "@playwright/test";

test.describe("Etapa 1 - Gold lead management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("render gold leads list from API", async ({ page }) => {
    await page.route("**/api/v1/gold/companies?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "g1",
              denumire: "Gold Lead Test SRL",
              currentState: "ENGAGED",
              judetCod: "BR",
              cifraAfaceri: "4500000",
              leadScore: 88,
            },
          ],
          meta: { total: 1, limit: 50, offset: 0 },
        }),
      });
    });

    await page.goto("/gold");
    await expect(page.getByText(/Leads Gold/i)).toBeVisible();
    await expect(page.getByText("Gold Lead Test SRL")).toBeVisible();
    await expect(page.getByText("ENGAGED")).toBeVisible();
    await expect(page.getByRole("button", { name: /Launch Outreach/i })).toBeVisible();
  });
});
