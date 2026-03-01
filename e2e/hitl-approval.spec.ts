import { test, expect } from "@playwright/test";

test.describe("Etapa 1 - HITL approval flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("approve and reject HITL tasks", async ({ page }) => {
    await page.route("**/api/v1/enrichment/approvals?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "a1",
              title: "Revizie dedup",
              description: "Posibil duplicat",
              urgency: "HIGH",
              aiConfidence: 0.72,
            },
          ],
        }),
      });
    });

    await page.route("**/api/v1/enrichment/approvals/a1/decide", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: "a1", status: "approved" },
        }),
      });
    });

    await page.goto("/approvals");
    await expect(page.getByText(/HITL Approvals/i)).toBeVisible();
    await expect(page.getByText("Revizie dedup")).toBeVisible();

    await page.getByRole("button", { name: /Aprobă/i }).click();
    await page.getByRole("button", { name: /Respinge/i }).click();
  });
});
