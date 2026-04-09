import { test, expect } from "./fixtures/test-with-mocks.ts";
import { LEAD_JOURNEY_ID } from "./fixtures/api-mock.ts";

test.describe("Lead management", () => {
  test("listă → dublu-clic detaliu → conversație și activity", async ({ page }) => {
    await page.goto("/outreach/leads");
    await expect(page.getByRole("heading", { name: /Lead Management/i })).toBeVisible();
    await expect(page.getByText("Companie E2E SA")).toBeVisible();
    await page.getByText("Companie E2E SA").dblclick();
    await expect(page).toHaveURL(new RegExp(`/outreach/leads/${LEAD_JOURNEY_ID}`));
    await expect(page.getByText("Mesaj E2E de test")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Activity log" })).toBeVisible();
    await expect(page.getByText("Activitate E2E")).toBeVisible();
  });
});
