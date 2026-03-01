import { test, expect } from "@playwright/test";

test.describe("Etapa 1 - Import CSV flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("upload CSV and list import batch", async ({ page }) => {
    await page.route("**/api/v1/imports?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "b1",
              filename: "sample-contacts.csv",
              totalRows: 120,
              processedRows: 120,
              status: "completed",
              createdAt: new Date().toISOString(),
            },
          ],
          meta: { total: 1, limit: 25, offset: 0 },
        }),
      });
    });

    await page.route("**/api/v1/imports", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: "b1", filename: "sample-contacts.csv", status: "pending" },
        }),
      });
    });

    await page.goto("/import");
    await expect(page.getByText(/Istoric Importuri/i)).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "sample-contacts.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("name,cui,email\nCompanie Test,12345678,test@example.com"),
    });

    await expect(page.getByText("sample-contacts.csv")).toBeVisible();
  });
});
