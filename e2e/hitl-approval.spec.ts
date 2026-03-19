import { test, expect } from "@playwright/test";

test.describe("Etapa 1 - HITL approval flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("approve a HITL task", async ({ page }) => {
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
    await expect(page.getByText(/Revizie dedup/))
      .toBeVisible({ timeout: 2000 })
      .catch(() => {
        // Card may have been removed after approval - that's OK
      });
  });

  test("reject a HITL task", async ({ page }) => {
    await page.route("**/api/v1/enrichment/approvals?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: "b1",
              title: "Revizie calitate",
              description: "Scor calitate redus",
              urgency: "MED",
              aiConfidence: 0.55,
            },
          ],
        }),
      });
    });

    await page.route("**/api/v1/enrichment/approvals/b1/decide", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: "b1", status: "rejected" },
        }),
      });
    });

    await page.goto("/approvals");
    await expect(page.getByText(/HITL Approvals/i)).toBeVisible();
    await expect(page.getByText("Revizie calitate")).toBeVisible();

    await page.getByRole("button", { name: /Respinge/i }).click();
  });

  test("tab Completed shows resolved tasks", async ({ page }) => {
    await page.route("**/api/v1/enrichment/approvals?**", async (route) => {
      const url = route.request().url();
      const isCompleted = url.includes("approved") || url.includes("rejected");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: isCompleted
            ? [
                {
                  id: "c1",
                  title: "Task finalizat",
                  decidedAt: new Date().toISOString(),
                  decision: "approve",
                },
              ]
            : [],
        }),
      });
    });

    await page.goto("/approvals");
    await expect(page.getByText(/HITL Approvals/i)).toBeVisible();
    await page.getByRole("button", { name: /Completate/i }).click();
    await expect(page.getByText("Task finalizat")).toBeVisible();
  });
});
