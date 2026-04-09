import { test, expect } from "./fixtures/test-with-mocks.ts";

test.describe("Import CSV (UI curent)", () => {
  test("încărcare fișier pe /imports/new → confirmare", async ({ page }) => {
    await page.goto("/imports/new");
    await expect(page.getByRole("heading", { name: /Import Nou/i })).toBeVisible();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "e2e-upload.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("denumire,cui\nCompanie X,123\n"),
    });
    await expect(page.getByText(/Import creat:\s*e2e-upload\.csv/)).toBeVisible({
      timeout: 15_000,
    });
  });
});
