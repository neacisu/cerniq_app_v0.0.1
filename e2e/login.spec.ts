import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
  test("redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows login form and can submit with demo credentials", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /autentificare/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toHaveValue("admin@demo-tenant.com");
    await expect(page.getByPlaceholder(/••••••••/)).toHaveValue("demo123456");

    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("shows validation error for invalid email", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/email/i).fill("invalid");
    await page.getByPlaceholder(/••••••••/).fill("demo123456");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page.getByText(/email invalid/i)).toBeVisible();
  });
});
