import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const runGolden =
    process.env["RUN_E2E_GOLDEN"] === "true" &&
    process.env["SUPABASE_URL"] &&
    process.env["SUPABASE_SERVICE_ROLE_KEY"];

test.describe("optional authenticated ReversePath Golden Path", () => {
    test.skip(
        !runGolden,
        "Set RUN_E2E_GOLDEN=true with Supabase test credentials to run this flow.",
    );

    test("authenticated user can complete the ReversePath golden path with mock AI", async ({
        page,
    }) => {
        const password = "ReversePath-e2e-password-12345";
        const email = `reversepath-e2e-${crypto.randomUUID()}@example.test`;
        const admin = createClient(
            process.env["SUPABASE_URL"]!,
            process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
            {
                auth: { persistSession: false, autoRefreshToken: false },
            },
        );
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        expect(created.error).toBeNull();

        try {
            await page.goto("/auth");
            await page.getByLabel("Email").fill(email);
            await page.getByLabel("Password").fill(password);
            await page.getByRole("button", { name: /^sign in$/i }).click();
            await expect(page.getByRole("heading", { name: /your plans/i })).toBeVisible();

            await page.getByRole("link", { name: /new objective/i }).click();
            await page
                .getByPlaceholder(/switch into product design/i)
                .fill(
                    "I want to switch into product design within a year, but I have a full-time job and no portfolio.",
                );
            await page.getByRole("button", { name: /analyse objective/i }).click();

            await expect(
                page.getByRole("heading", { name: /switch into product design/i }),
            ).toBeVisible();
            if (
                await page
                    .getByRole("button", { name: /save answers/i })
                    .isVisible()
                    .catch(() => false)
            ) {
                await page
                    .getByLabel(/current baseline/i)
                    .fill("I have no portfolio and 5 hours per week.");
                await page
                    .getByLabel(/time, money, or energy/i)
                    .fill("Five focused hours each week.");
                await page.getByLabel(/constraint/i).fill("No case studies yet.");
                await page.getByRole("button", { name: /save answers/i }).click();
            }

            await page.getByRole("button", { name: /generate plan/i }).click();
            await expect(page.getByText(/plan generated/i)).toBeVisible();
            await expect(page.getByText(/strategies/i)).toBeVisible();
            await expect(page.getByText(/assumptions/i)).toBeVisible();
            await expect(page.getByText(/risks/i)).toBeVisible();
            await expect(page.getByText(/write the current-state snapshot/i)).toBeVisible();
            await expect(page.getByText(/run the blocker-removal step/i)).toBeVisible();

            await page
                .getByRole("button", { name: /^done$/i })
                .first()
                .click();
            await expect(page.getByText(/action updated/i)).toBeVisible();

            await page
                .getByPlaceholder(/what moved/i)
                .fill("My weekly capacity dropped to three hours.");
            await page.getByPlaceholder(/what changed/i).fill("Weekly capacity");
            await page.getByPlaceholder(/new value/i).fill("3 hours per week");
            await page.getByRole("button", { name: /save check-in/i }).click();
            await expect(page.getByText(/check-in saved/i)).toBeVisible();

            await page
                .getByPlaceholder(/what moved/i)
                .fill("Capacity changed enough to resize the first path.");
            await page.getByPlaceholder(/what changed/i).fill("Weekly capacity");
            await page.getByPlaceholder(/new value/i).fill("3 hours per week");
            await page.getByRole("button", { name: /propose a revised plan/i }).click();
            await expect(page.getByText(/candidate/i)).toBeVisible();
            await expect(page.getByText(/what changed in this version/i)).toBeVisible();
            await page
                .getByRole("button", { name: /accept this version|^accept$/i })
                .first()
                .click();
            await expect(page.getByText(/is now active/i)).toBeVisible();

            await page.reload();
            await expect(page.getByText(/versions/i)).toBeVisible();
            await expect(page.getByText(/v1/i)).toBeVisible();
            await expect(page.getByText(/v2/i)).toBeVisible();
        } finally {
            if (created.data.user?.id) await admin.auth.admin.deleteUser(created.data.user.id);
        }
    });
});
