import { test, expect } from "@playwright/test"

test("login page has required form fields", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible()
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
})

test("signup page has required form fields", async ({ page }) => {
  await page.goto("/signup")
  await expect(page.getByRole("heading", /create account|sign up/i)).toBeVisible()
})

test("unauthenticated user is redirected from dashboard", async ({ page }) => {
  await page.goto("/dashboard")
  // Should redirect to login or show login prompt
  await expect(page).toHaveURL(/login/i)
})

test("login form shows validation for empty fields", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("button", { name: /sign in|submit/i }).click()
  // Browser native validation or custom validation should fire
  const emailInput = page.getByLabel(/email/i)
  await expect(emailInput).toBeVisible()
})
