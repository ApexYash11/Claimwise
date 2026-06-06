import { test, expect } from "@playwright/test"

test("landing page loads and shows hero section", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /stop guessing/i })).toBeVisible()
  await expect(page.getByRole("button", { name: /book demo/i })).toBeVisible()
})

test("landing page features section is visible", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText(/clause-level extraction/i)).toBeVisible()
  await expect(page.getByText(/comparative risk scoring/i)).toBeVisible()
  await expect(page.getByText(/claim readiness intelligence/i)).toBeVisible()
})

test("navigation has sign in and book demo links", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible()
  await expect(page.getByRole("link", { name: /book demo/i })).toBeVisible()
})
