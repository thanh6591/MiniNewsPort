import { test, expect } from "@playwright/test";

test.describe("Public News Site", () => {
  test("should load homepage and display news", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("header")).toBeVisible();
    await expect(page).toHaveTitle(/Mini News Portal/i);
  });

  test("should display categories on homepage", async ({ page }) => {
    await page.goto("/");

    await page.waitForSelector("h2");

    const categories = page.locator("section h2");
    await expect(categories).not.toHaveCount(0);
  });

  test("should navigate to category page", async ({ page }) => {
    await page.goto("/");

    await page.click("a[href^='/category/']");

    await expect(page).toHaveURL(/\/category\//);
  });

  test("should navigate to news detail page", async ({ page }) => {
    await page.goto("/");

    await page.click("a[href^='/news/']");

    await expect(page).toHaveURL(/\/news\//);

    await expect(page.locator("article")).toBeVisible();
  });

  test("should have pagination on category page", async ({ page }) => {
    await page.goto("/");

    await page.click("a[href^='/category/']");

    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));

    await page.waitForTimeout(1000);
  });

  test("should display most viewed articles", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=Most Viewed Today")).toBeVisible();
  });

  test("should have responsive navigation in header", async ({ page }, testInfo) => {
    await page.goto("/");

    await expect(page.locator("a[href='/']")).toBeVisible();

    if (testInfo.project.name.includes("mobile")) {
      await page.click("button[aria-label='Toggle navigation menu']");
      await expect(page.locator("a[href='/admin/login']")).toBeVisible();
    } else {
      await expect(page.locator("a[href='/admin/login']")).toBeVisible();
    }
  });

  test("should not overflow horizontally on home page", async ({ page }) => {
    await page.goto("/");

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasOverflow).toBeFalsy();
  });

  test("should have footer", async ({ page }) => {
    await page.goto("/");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect(page.locator("footer")).toBeVisible();
  });

  test("should show backend deep-dive tab for bulk import diagram", async ({ page }) => {
    await page.goto("/diagrams/bulk-import-messaging");

    await expect(page.getByTestId("bulk-import-tab-diagram")).toBeVisible();
    await expect(page.getByTestId("bulk-import-tab-deep-dive")).toBeVisible();

    await page.getByTestId("bulk-import-tab-deep-dive").click();

    await expect(page.getByTestId("deep-dive-title")).toBeVisible();
    await expect(page.getByTestId("stage-section-intake")).toBeVisible();
    await expect(page.getByTestId("stage-section-enqueue")).toBeVisible();
    await expect(page.getByTestId("stage-section-processing")).toBeVisible();
    await expect(page.getByTestId("stage-section-retry-dlq")).toBeVisible();
    await expect(page.getByTestId("stage-section-polling")).toBeVisible();
    await expect(page.getByTestId("stage-section-email-notification")).toBeVisible();
  });

  test("should render code references and storage details for each deep-dive stage", async ({ page }) => {
    await page.goto("/diagrams/bulk-import-messaging");
    await page.getByTestId("bulk-import-tab-deep-dive").click();

    const stageIds = [
      "intake",
      "validation",
      "enqueue",
      "processing",
      "retry-dlq",
      "polling",
      "email-notification"
    ];

    for (const stageId of stageIds) {
      await expect(page.locator(`[data-testid^=\"stage-code-ref-${stageId}-\"]`).first()).toBeVisible();
      await expect(page.locator(`[data-testid^=\"stage-storage-${stageId}-\"]`).first()).toBeVisible();
    }
  });
});
