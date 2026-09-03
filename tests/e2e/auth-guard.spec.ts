import { expect, test } from "@playwright/test";

test("public landing page is available", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /start at the outcome/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /map your first objective/i })).toBeVisible();
});

test("protected objective route redirects unauthenticated users to auth", async ({ page }) => {
    await page.goto("/new");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("heading", { name: /sign in to reversepath/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
});
