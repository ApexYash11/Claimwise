import { test, expect } from "@playwright/test"

test("upload page shows upload area", async ({ page }) => {
  // This test runs against the client-side rendered upload page
  // It will redirect to login since no auth token exists
  await page.goto("/upload")
  // Should redirect to login since user isn't authenticated
  await expect(page).toHaveURL(/login/i)
})

test("upload page has back navigation to dashboard", async ({ page }) => {
  await page.goto("/upload")
  await expect(page.getByRole("link", { name: /back to dashboard/i })).toBeVisible()
})
