import { expect, test } from "./fixtures";

// Intercepted request contracts only: no provider navigation, signup or email is sent.
test.use({ trace: "off", screenshot: "off", video: "off" });

test("Google initiation targets the configured project and exact current auth origin without provider calls", async ({
    page,
    baseURL,
}) => {
    let requested = false;
    await page.route("**/auth/v1/authorize**", async (route) => {
        const url = new URL(route.request().url());
        expect(url.origin).toBe("https://usvopldwiwzlvoqawvcu.supabase.co");
        expect(url.searchParams.get("provider")).toBe("google");
        expect(url.searchParams.get("redirect_to")).toBe(new URL("/auth", baseURL!).href);
        requested = true;
        await route.fulfill({
            status: 200,
            contentType: "text/plain",
            body: "OAuth request intercepted; no consent or callback performed.",
        });
    });
    await page.goto("/auth");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await expect.poll(() => requested).toBe(true);
});

test("email confirmation request returns to this exact origin without creating an account", async ({
    page,
    baseURL,
}) => {
    let requested = false;
    await page.route("**/auth/v1/signup**", async (route) => {
        const url = new URL(route.request().url());
        expect(url.origin).toBe("https://usvopldwiwzlvoqawvcu.supabase.co");
        expect(url.searchParams.get("redirect_to")).toBe(new URL(baseURL!).origin);
        requested = true;
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                id: "00000000-0000-4000-8000-000000000001",
                aud: "authenticated",
                email: "origin-contract@example.invalid",
                confirmation_sent_at: "2026-10-22T00:00:00Z",
            }),
        });
    });
    await page.goto("/auth");
    await page.getByRole("button", { name: /no account yet/i }).click();
    await page.getByLabel("Email").fill("origin-contract@example.invalid");
    await page.getByLabel("Password").fill("Offline-origin-test-password-123");
    await page.getByRole("button", { name: /^create account$/i }).click();
    await expect(page.getByRole("status")).toContainText("Check your email");
    expect(requested).toBe(true);
    await expect(page).toHaveURL(new URL("/auth", baseURL!).href);
});
