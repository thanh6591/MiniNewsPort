import { test } from "@playwright/test";

test.describe("Bulk import (skipped pending workers in CI)", () => {
  test.skip("admin can submit 5 URLs and see progress reach Published/Failed", async () => {
    // Pending: requires Redis or in-process workers + seed fixture HTML hosts.
    // The flow:
    // 1. Admin logs in.
    // 2. Visit /admin/imports, paste 5 URLs, choose category, submit.
    // 3. Expect 202 and redirect to /admin/imports/:batchId.
    // 4. Poll the progress dashboard; expect all 5 to settle (Published or Failed).
  });
});
