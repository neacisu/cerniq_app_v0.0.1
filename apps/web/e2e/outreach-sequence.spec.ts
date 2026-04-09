import { test, expect } from "./fixtures/test-with-mocks.ts";

test.describe("Outreach secvențe", () => {
  test("creare secvență cu pas + template → listă Inactiv", async ({ page }) => {
    await page.goto("/outreach/sequences/new");
    await expect(page.getByRole("heading", { name: /Secvență Nouă/i })).toBeVisible();
    await page.getByPlaceholder(/Agro Intro/i).fill("Secvență E2E Playwright");
    await page.locator("select").nth(1).selectOption({ label: "Template E2E" });
    await page.getByRole("button", { name: /Creează Secvență/i }).click();
    await expect(page).toHaveURL(/\/outreach\/sequences$/, { timeout: 20_000 });
    await expect(page.getByText("Secvență E2E Playwright")).toBeVisible();
    await expect(page.getByText("Inactiv").first()).toBeVisible();
  });
});
