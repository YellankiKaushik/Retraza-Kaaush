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

test("signup awaiting email confirmation stays on auth and requests confirmation", async ({ page }) => {
    await page.route("**/auth/v1/signup*", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                id: "c470438a-f388-48dc-bffa-bf6153139c31",
                aud: "authenticated",
                email: "confirmation-test@example.test",
                confirmation_sent_at: new Date().toISOString(),
            }),
        }),
    );
    await page.goto("/auth");
    await page.getByRole("button", { name: /no account yet/i }).click();
    await page.getByLabel("Email").fill("confirmation-test@example.test");
    await page.getByLabel("Password").fill("Confirmation-test-password-123");
    await page.getByRole("button", { name: /^create account$/i }).click();
    await expect(page.getByText("Check your email to confirm your account, then sign in.")).toBeVisible();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("heading", { name: /sign in to reversepath/i })).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveValue("");
});
