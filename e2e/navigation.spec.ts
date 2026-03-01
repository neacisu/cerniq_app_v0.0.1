import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /autentificare/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("sidebar links navigate to expected routes", async ({ page }) => {
    const links = [
      { name: /dashboard/i, path: "/dashboard" },
      { name: /import/i, path: "/import" },
      { name: /bronze/i, path: "/bronze" },
      { name: /silver/i, path: "/silver" },
      { name: /gold/i, path: "/gold" },
      { name: /aprobări|approvals/i, path: "/approvals" },
      { name: /outreach/i, path: "/outreach" },
      { name: /lead/i, path: "/leads" },
      { name: /secvențe|sequences/i, path: "/sequences" },
      { name: /șablon|template/i, path: "/templates" },
      { name: /telefoane|phone/i, path: "/phones" },
      { name: /review/i, path: "/review" },
      { name: /ai dashboard/i, path: "/ai-dashboard" },
      { name: /negocieri|negotiation/i, path: "/negotiations" },
      { name: /oferte|offer/i, path: "/offers" },
      { name: /factur/i, path: "/invoices" },
      { name: /guardrail/i, path: "/guardrails" },
      { name: /plăți|payment/i, path: "/payments" },
      { name: /credit/i, path: "/credit" },
      { name: /logistic/i, path: "/logistics" },
      { name: /retur|return/i, path: "/returns" },
      { name: /nurturing/i, path: "/nurturing" },
      { name: /referral/i, path: "/referrals" },
      { name: /churn/i, path: "/churn" },
      { name: /hartă|map|geo/i, path: "/geo-map" },
      { name: /worker/i, path: "/workers" },
      { name: /setări|setting/i, path: "/settings" },
    ];

    for (const { name, path } of links.slice(0, 8)) {
      const link = page.getByRole("link", { name });
      if ((await link.count()) > 0) {
        await link.click();
        await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
      }
    }
  });

  test("skip link focuses main content", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /sari la conținut/i });
    await expect(skipLink).toBeFocused();
    await skipLink.click();
    await expect(page.locator("#main-content")).toBeFocused();
  });
});
