import { test, expect } from "@playwright/test"

test.describe("Visual Regression", () => {
  test("landing page full page", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("landing-full.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    })
  })

  test("landing page hero section (viewport)", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("landing-hero.png", {
      maxDiffPixelRatio: 0.02,
    })
  })

  test("login page", async ({ page }) => {
    await page.goto("/login")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("login.png", {
      maxDiffPixelRatio: 0.02,
    })
  })

  test("404 page", async ({ page }) => {
    await page.goto("/nonexistent-page")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("404.png", {
      maxDiffPixelRatio: 0.02,
    })
  })

  test("landing page mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page).toHaveScreenshot("landing-mobile.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    })
  })
})
