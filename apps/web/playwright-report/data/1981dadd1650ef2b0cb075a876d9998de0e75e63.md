# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public.spec.ts >> Public News Site >> should render code references and storage details for each deep-dive stage
- Location: e2e/public.spec.ts:102:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('[data-testid^="stage-code-ref-intake-"]').first()
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid^="stage-code-ref-intake-"]').first()
    13 × locator resolved to <li data-v-80e3330a="" data-testid="stage-code-ref-intake-0" class="rounded border border-slate-200 bg-white p-2">…</li>
       - unexpected value "hidden"

```

```yaml
- banner:
  - link "Mini News Portal":
    - /url: /
  - navigation "Primary":
    - link "Home":
      - /url: /
    - link "Login":
      - /url: /admin/login
- main:
  - heading "Bulk Import and Messaging Layer" [level=1]
  - paragraph: End-to-end async flow from admin URL submission to scrape retries, dead-letter handling, and consolidated email alerts.
  - link "Back to Diagram Center":
    - /url: /erd
  - navigation "Bulk import diagram tabs":
    - button "System Diagram"
    - button "Backend Deep Dive"
  - document:
    - paragraph: 4. Dashboard polling
    - paragraph: 3. DLQ handling and email alert
    - paragraph: 2. Scraping worker and retries
    - paragraph: 1. Submission and acceptance
    - paragraph: "yes"
    - paragraph: no or exhausted
    - paragraph: Admin Import UI URLs + category
    - paragraph: POST /api/admin/imports/bulk
    - paragraph: validate + requireAdmin
    - paragraph: importService.submitBulk
    - paragraph: import_batches
    - paragraph: import_items PENDING
    - paragraph: news-scraping-queue
    - paragraph: 202 Accepted batchId + counts
    - paragraph: Scraping Worker per-domain semaphore
    - paragraph: fetch + parse + sanitize
    - paragraph: news PUBLISHED
    - paragraph: import_items PUBLISHED news_id linked
    - paragraph: Transient failure?
    - paragraph: "retry: 3 attempts exponential, base 10s"
    - paragraph: import_items FAILED failure_reason
    - paragraph: news-scraping-dlq
    - paragraph: DLQ notifier worker
    - paragraph: flush now? 25 items OR 60s timer
    - paragraph: build consolidated report url + reason + failedAt
    - paragraph: "mailer: SMTP or Noop"
    - paragraph: send to ADMIN_EMAIL
    - paragraph: GET /api/admin/imports/:batchId poll every 3s
    - paragraph: counts + per-item states Pending, Processing, Published, Failed
  - paragraph: Read This Diagram
  - list:
    - listitem: Accepted bulk imports return 202 immediately after enqueuing scrape jobs.
    - listitem: Scraper worker retries transient failures with exponential backoff (3 attempts, 10s base).
    - listitem: Exhausted jobs move to DLQ and failed items are marked in import item state.
    - listitem: DLQ notifier batches failures and sends one consolidated email to ADMIN_EMAIL.
- contentinfo:
  - paragraph: Mini News Portal
  - paragraph: © 2026 Mini News Portal. All rights reserved.
- img
- button "Toggle Nuxt DevTools":
  - img
- text: 119 ms
- button "Toggle Component Inspector":
  - img
```

# Test source

```ts
  17  |     await expect(categories).not.toHaveCount(0);
  18  |   });
  19  | 
  20  |   test("should navigate to category page", async ({ page }) => {
  21  |     await page.goto("/");
  22  | 
  23  |     await page.click("a[href^='/category/']");
  24  | 
  25  |     await expect(page).toHaveURL(/\/category\//);
  26  |   });
  27  | 
  28  |   test("should navigate to news detail page", async ({ page }) => {
  29  |     await page.goto("/");
  30  | 
  31  |     await page.click("a[href^='/news/']");
  32  | 
  33  |     await expect(page).toHaveURL(/\/news\//);
  34  | 
  35  |     await expect(page.locator("article")).toBeVisible();
  36  |   });
  37  | 
  38  |   test("should have pagination on category page", async ({ page }) => {
  39  |     await page.goto("/");
  40  | 
  41  |     await page.click("a[href^='/category/']");
  42  | 
  43  |     await page.evaluate(() => window.scrollBy(0, window.innerHeight * 3));
  44  | 
  45  |     await page.waitForTimeout(1000);
  46  |   });
  47  | 
  48  |   test("should display most viewed articles", async ({ page }) => {
  49  |     await page.goto("/");
  50  | 
  51  |     await expect(page.locator("text=Most Viewed Today")).toBeVisible();
  52  |   });
  53  | 
  54  |   test("should have responsive navigation in header", async ({ page }, testInfo) => {
  55  |     await page.goto("/");
  56  | 
  57  |     await expect(page.locator("a[href='/']")).toBeVisible();
  58  | 
  59  |     if (testInfo.project.name.includes("mobile")) {
  60  |       await page.click("button[aria-label='Toggle navigation menu']");
  61  |       await expect(page.locator("a[href='/admin/login']")).toBeVisible();
  62  |     } else {
  63  |       await expect(page.locator("a[href='/admin/login']")).toBeVisible();
  64  |     }
  65  |   });
  66  | 
  67  |   test("should not overflow horizontally on home page", async ({ page }) => {
  68  |     await page.goto("/");
  69  | 
  70  |     const hasOverflow = await page.evaluate(() => {
  71  |       return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  72  |     });
  73  | 
  74  |     expect(hasOverflow).toBeFalsy();
  75  |   });
  76  | 
  77  |   test("should have footer", async ({ page }) => {
  78  |     await page.goto("/");
  79  | 
  80  |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  81  | 
  82  |     await expect(page.locator("footer")).toBeVisible();
  83  |   });
  84  | 
  85  |   test("should show backend deep-dive tab for bulk import diagram", async ({ page }) => {
  86  |     await page.goto("/diagrams/bulk-import-messaging");
  87  | 
  88  |     await expect(page.getByTestId("bulk-import-tab-diagram")).toBeVisible();
  89  |     await expect(page.getByTestId("bulk-import-tab-deep-dive")).toBeVisible();
  90  | 
  91  |     await page.getByTestId("bulk-import-tab-deep-dive").click();
  92  | 
  93  |     await expect(page.getByTestId("deep-dive-title")).toBeVisible();
  94  |     await expect(page.getByTestId("stage-section-intake")).toBeVisible();
  95  |     await expect(page.getByTestId("stage-section-enqueue")).toBeVisible();
  96  |     await expect(page.getByTestId("stage-section-processing")).toBeVisible();
  97  |     await expect(page.getByTestId("stage-section-retry-dlq")).toBeVisible();
  98  |     await expect(page.getByTestId("stage-section-polling")).toBeVisible();
  99  |     await expect(page.getByTestId("stage-section-email-notification")).toBeVisible();
  100 |   });
  101 | 
  102 |   test("should render code references and storage details for each deep-dive stage", async ({ page }) => {
  103 |     await page.goto("/diagrams/bulk-import-messaging");
  104 |     await page.getByTestId("bulk-import-tab-deep-dive").click();
  105 | 
  106 |     const stageIds = [
  107 |       "intake",
  108 |       "validation",
  109 |       "enqueue",
  110 |       "processing",
  111 |       "retry-dlq",
  112 |       "polling",
  113 |       "email-notification"
  114 |     ];
  115 | 
  116 |     for (const stageId of stageIds) {
> 117 |       await expect(page.locator(`[data-testid^=\"stage-code-ref-${stageId}-\"]`).first()).toBeVisible();
      |                                                                                           ^ Error: expect(locator).toBeVisible() failed
  118 |       await expect(page.locator(`[data-testid^=\"stage-storage-${stageId}-\"]`).first()).toBeVisible();
  119 |     }
  120 |   });
  121 | });
  122 | 
```