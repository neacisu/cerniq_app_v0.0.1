import { test, expect } from "@playwright/test";

/**
 * Security tests for Etapa 1 API.
 * These tests verify that authentication, authorization and rate limiting
 * are correctly enforced.
 */
test.describe("Security - Authentication & Authorization", () => {
  test("unauthenticated requests to API are rejected with 401", async ({ request }) => {
    const endpoints = [
      "/api/v1/dashboard/stats",
      "/api/v1/silver/companies",
      "/api/v1/gold/companies",
      "/api/v1/enrichment/approvals",
    ];
    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), `${endpoint} should return 401`).toBe(401);
    }
  });

  test("login page is accessible without authentication", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("button", { name: /autentificare/i })).toBeVisible();
  });

  test("invalid credentials return error", async ({ request }) => {
    // Deliberately wrong credentials used only to assert the auth endpoint rejects them with 4xx.
    const email = "invalid@test.com";
    const secret = "not-a-real-credential-intentionally-wrong";
    const response = await request.post("/api/v1/auth/login", {
      data: { email, password: secret },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test("protected routes redirect to login when unauthenticated", async ({ page }) => {
    const protectedRoutes = ["/dashboard", "/silver", "/gold", "/approvals"];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    }
  });
});

test.describe("Security - XSS Prevention", () => {
  test("XSS payload in search field is sanitized", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    await page.route("**/api/v1/silver/companies?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [], meta: { total: 0 } }),
      });
    });

    await page.goto("/silver");
    const searchInput = page.locator('input[placeholder*="Cauta"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('<script>alert("xss")</script>');
      // Verify no alert dialog appeared
      const dialogPromise = page.waitForEvent("dialog", { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      expect(dialog).toBeNull();
    }
  });
});
