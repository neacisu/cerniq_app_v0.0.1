import { test, expect } from "@playwright/test";

/**
 * Suite minimă @critical: o singură sesiune după login (evită race între workeri Paraleli
 * și pierderea contextului). Login ca în `navigation.spec.ts` — necesită API care acceptă
 * credențialele demo când rulează `pnpm --filter @cerniq/web dev`.
 *
 * Rulare: `pnpm test:e2e --grep @critical`
 */
test.describe("Critical stages E1–E5 @critical", () => {
  test("navigare reprezentativă E1→E5 după autentificare", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    await page.goto("/gold");
    await expect(page.getByRole("heading", { name: /Gold Leads/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/leads");
    await expect(page.getByRole("heading", { name: /Lead Management/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/ai-dashboard");
    await expect(page.getByRole("heading", { name: /AI Sales Agent Dashboard/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/payments");
    await expect(page.getByRole("heading", { name: /^Payments — Reconciliere$/ })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/nurturing");
    await expect(
      page.getByRole("heading", { name: /Retention — Monitorizare Clienți/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/brain");
    await expect(page.getByTestId("cognitive-brain-page")).toBeVisible({ timeout: 15_000 });
  });
});
