import { expect, test } from "./fixtures";

test("unconfigured authentication shows a useful message without crashing", async ({ page }) => {
    test.skip(
        !!process.env["VITE_SUPABASE_URL"] && !!process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
        "This check requires empty public Supabase configuration.",
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/auth");
    await expect(page.getByRole("alert")).toContainText("connected to Supabase");
    await expect(page.getByRole("button", { name: /^Sign in$/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    expect(errors).toEqual([]);
});

test("signup waits for confirmation instead of falsely reporting a signed-in account", async ({
    page,
}) => {
    test.skip(
        !process.env["VITE_SUPABASE_URL"] || !process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
        "This check uses a configured public client with an intercepted signup response.",
    );
    await page.route("**/auth/v1/signup**", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                id: "00000000-0000-4000-8000-000000000001",
                aud: "authenticated",
                role: "authenticated",
                email: "demo@example.test",
                app_metadata: { provider: "email", providers: ["email"] },
                user_metadata: {},
                created_at: new Date().toISOString(),
                identities: [],
            }),
        });
    });
    await page.goto("/auth");
    await page.getByRole("button", { name: "No account yet? Create one" }).click();
    await page.getByLabel("Email").fill("demo@example.test");
    await page.getByLabel("Password").fill("ReversePath-test-only-123");
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Check your email");
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("heading", { name: "Sign in to ReversePath" })).toBeVisible();
});

test("failed sign-in keeps the form available and reports the error", async ({ page }) => {
    test.skip(
        !process.env["VITE_SUPABASE_URL"] || !process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
        "This check uses an intercepted authentication error.",
    );
    await page.route("**/auth/v1/token**", (route) =>
        route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
                error_code: "invalid_credentials",
                msg: "Invalid login credentials",
            }),
        }),
    );
    await page.goto("/auth");
    await page.getByLabel("Email").fill("demo@example.test");
    await page.getByLabel("Password").fill("ReversePath-test-only-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Invalid login credentials", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
    await expect(page).toHaveURL(/\/auth/);
});

for (const failure of [
    {
        name: "email rate limit",
        status: 429,
        code: "over_email_send_rate_limit",
        message: "email rate limit exceeded",
        expected: "Confirmation emails are temporarily rate limited",
    },
    {
        name: "restricted email sender",
        status: 403,
        code: "email_address_not_authorized",
        message: "Email address not authorized",
        expected: "Confirmation email delivery is currently unavailable",
    },
    {
        name: "email delivery failure",
        status: 500,
        code: "unexpected_failure",
        message: "Error sending confirmation email",
        expected: "Confirmation email delivery is currently unavailable",
    },
]) {
    test(`signup recovers from ${failure.name} without resending automatically`, async ({
        page,
    }) => {
        test.skip(
            !process.env["VITE_SUPABASE_URL"] || !process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
            "Requires a configured public client; every signup response is intercepted.",
        );
        let requests = 0;
        await page.route("**/auth/v1/signup**", (route) => {
            requests += 1;
            return route.fulfill({
                status: failure.status,
                contentType: "application/json",
                headers: {
                    "x-supabase-api-version": "2024-01-01",
                    "access-control-expose-headers": "x-supabase-api-version",
                },
                body: JSON.stringify({ code: failure.code, msg: failure.message }),
            });
        });
        await page.goto("/auth");
        await page.getByRole("button", { name: "No account yet? Create one" }).click();
        await page.getByLabel("Email").fill("signup-regression@example.com");
        await page.getByLabel("Password").fill("ReversePath-test-only-123");
        await page.getByRole("button", { name: "Create account", exact: true }).click();
        await expect(page.getByRole("alert")).toContainText(failure.expected);
        await expect(
            page.getByRole("button", { name: "Create account", exact: true }),
        ).toBeEnabled();
        await expect(page.getByLabel("Email")).toHaveValue("signup-regression@example.com");
        await expect(page.getByRole("status")).toHaveCount(0);
        await expect(page).toHaveURL(/\/auth/);
        expect(requests).toBe(1);
        await page.getByRole("button", { name: "Already have an account? Sign in" }).click();
        await expect(page.getByRole("alert")).toHaveCount(0);
    });
}
