import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
    createSupabaseTestFetch,
    hasSupabaseLiveTestCredentials,
    loadProjectEnv,
    supabaseTestUrl,
    testSecretKey,
} from "../helpers/test-env";

loadProjectEnv();
const runGolden =
    process.env["RUN_E2E_GOLDEN"] === "true" &&
    hasSupabaseLiveTestCredentials();

test.describe("optional authenticated ReversePath Golden Path", () => {
    test.setTimeout(180_000);

    test.skip(
        !runGolden,
        "Set RUN_E2E_GOLDEN=true with Supabase credentials to run this flow.",
    );

    test("authenticated user can complete the ReversePath golden path with live MVP AI", async ({
        page,
    }) => {
        const debugGolden = process.env["PLAYWRIGHT_DEBUG_GOLDEN"] === "true";
        const httpEvents: string[] = [];
        if (debugGolden) {
            page.on("response", async (response) => {
                const url = new URL(response.url());
                if (url.origin !== "http://127.0.0.1:4173") {
                    if (response.status() >= 400) {
                        httpEvents.push(`${response.status()} ${url.origin}${url.pathname}`);
                    }
                    return;
                }
                if (/\.(?:js|css|map|png|svg|ico)$/i.test(url.pathname)) return;
                let body = "";
                body = await response.text().catch(() => "");
                httpEvents.push(
                    `${response.status()} ${url.origin}${url.pathname} ${body.slice(0, 400).replace(/\S+@\S+\.\S+/g, "[email]")}`,
                );
            });
            page.on("requestfailed", (request) => {
                const url = new URL(request.url());
                httpEvents.push(
                    `REQUEST_FAILED ${url.origin}${url.pathname} ${request.failure()?.errorText ?? ""}`,
                );
            });
        }

        const password = "ReversePath-e2e-password-12345";
        const runId = `reversepath-e2e-${crypto.randomUUID()}`;
        const email = `${runId}-a@example.test`;
        const secondEmail = `${runId}-b@example.test`;
        const url = supabaseTestUrl()!;
        const secretKey = testSecretKey()!;
        const admin = createClient(
            url,
            secretKey,
            {
                global: { fetch: createSupabaseTestFetch(secretKey) },
                auth: { persistSession: false, autoRefreshToken: false },
            },
        );
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        const secondCreated = await admin.auth.admin.createUser({
            email: secondEmail,
            password,
            email_confirm: true,
        });
        expect(created.error).toBeNull();
        expect(secondCreated.error).toBeNull();

        async function signIn(targetEmail: string) {
            await page.goto("/auth");
            await page.waitForLoadState("networkidle");
            await page.waitForTimeout(250);
            await page.getByLabel("Email").fill(targetEmail);
            await page.getByLabel("Password").fill(password);
            await page.getByRole("button", { name: /^sign in$/i }).click();
            try {
                await expect(page.getByRole("heading", { name: /your plans/i })).toBeVisible();
            } catch (error) {
                if (process.env["PLAYWRIGHT_DEBUG_SIGNIN"] === "true") {
                    const diagnostics = await page.evaluate(() => ({
                        url: window.location.href,
                        text: document.body.innerText,
                        storageKeys: Object.keys(window.localStorage),
                    }));
                    console.warn(
                        "SIGNIN_DIAGNOSTIC",
                        JSON.stringify({
                            url: diagnostics.url,
                            text: diagnostics.text.replace(/\S+@\S+\.\S+/g, "[email]"),
                            storageKeys: diagnostics.storageKeys.map((key) =>
                                /auth-token|supabase/i.test(key) ? "[supabase-storage-key]" : key,
                            ),
                        }),
                    );
                }
                throw error;
            }
        }

        try {
            await signIn(email);

            await page.getByRole("link", { name: /new objective/i }).click();
            await page
                .getByPlaceholder(/switch into product design/i)
                .fill(
                    "I want to switch into product design within a year, but I have a full-time job and no portfolio.",
                );
            await page.getByRole("button", { name: /analyse objective/i }).click();

            await expect(
                page.getByRole("heading", { name: /product design/i }),
            ).toBeVisible();
            if (
                await page
                    .getByRole("button", { name: /save answers/i })
                    .isVisible()
                    .catch(() => false)
            ) {
                const textboxes = page.getByRole("textbox");
                const count = await textboxes.count();
                for (let index = 0; index < count; index += 1) {
                    const textbox = textboxes.nth(index);
                    const accessibleName = await textbox.evaluate((element) => {
                        const input = element as HTMLInputElement | HTMLTextAreaElement;
                        return (
                            input.getAttribute("aria-label") ??
                            input.labels?.[0]?.textContent ??
                            input.getAttribute("placeholder") ??
                            ""
                        );
                    });
                    if (/^label\b|^value$/i.test(accessibleName.trim())) continue;
                    await textbox.fill(
                        "I have no portfolio yet, can commit five focused hours per week, know basic Figma, and prefer remote-friendly roles.",
                    );
                }
                await page.getByRole("button", { name: /save answers/i }).click();
                await expect(page.getByText(/ready for planning/i)).toBeVisible();
            }

            await page.waitForLoadState("networkidle");
            await page.waitForTimeout(500);
            const generateButton = page.getByRole("button", { name: /generate plan/i });
            await expect(generateButton).toBeEnabled();
            await generateButton.click();
            if (
                !(await page
                    .getByRole("button", { name: /mapping the graph/i })
                    .isVisible()
                    .catch(() => false))
            ) {
                await page.waitForTimeout(750);
                await generateButton.click();
            }
            try {
                await expect(page.getByText(/plan generated/i)).toBeVisible({ timeout: 90_000 });
            } catch (error) {
                if (debugGolden) {
                    const text = await page.evaluate(() => document.body.innerText);
                    console.warn(
                        "GOLDEN_PLAN_DIAGNOSTIC",
                        JSON.stringify({
                            url: page.url(),
                            text: text.replace(/\S+@\S+\.\S+/g, "[email]").slice(0, 3000),
                            httpEvents: httpEvents.slice(-20),
                        }),
                    );
                }
                throw error;
            }
            await expect(page.locator("main").getByText(/^Strategies$/)).toBeVisible();
            await expect(page.locator("main").getByText(/^Assumptions$/)).toBeVisible();
            await expect(page.locator("main").getByText(/^Risks & premortem$/)).toBeVisible();
            await expect(page.locator("main").getByText(/^Execution frontier/)).toBeVisible();
            await expect(page.getByRole("button", { name: /^done$/i }).first()).toBeVisible();

            await page
                .getByRole("button", { name: /^done$/i })
                .first()
                .click();
            await expect(page.locator("main").getByText(/\bDONE\b/).first()).toBeVisible();

            await page
                .getByPlaceholder(/what moved/i)
                .fill("My weekly capacity dropped to three hours.");
            await page.getByPlaceholder("What changed (label)").fill("Weekly capacity");
            await page.getByPlaceholder(/new value/i).fill("3 hours per week");
            await page.getByRole("button", { name: /save check-in/i }).click();
            await expect(page.getByText(/check-in saved/i)).toBeVisible();

            await page
                .getByPlaceholder(/what moved/i)
                .fill("Capacity changed enough to resize the first path.");
            await page.getByPlaceholder("What changed (label)").fill("Weekly capacity");
            await page.getByPlaceholder(/new value/i).fill("3 hours per week");
            await page.getByRole("button", { name: /propose a revised plan/i }).click();
            await expect(page.getByText(/Version \d+ is a candidate/i)).toBeVisible({
                timeout: 90_000,
            });
            await expect(page.getByText(/what changed in this version/i)).toBeVisible();
            await expect(page.getByRole("button", { name: /^reject$/i }).first()).toBeVisible();
            await page
                .getByRole("button", { name: /^reject$/i })
                .first()
                .click();
            await expect(page.locator("main").getByText(/^v\d+ · REJECTED/i)).toBeVisible();

            await page
                .getByPlaceholder(/what moved/i)
                .fill("Capacity changed enough to resize the first path.");
            await page.getByPlaceholder("What changed (label)").fill("Weekly capacity");
            await page.getByPlaceholder(/new value/i).fill("3 hours per week");
            await page.getByRole("button", { name: /propose a revised plan/i }).click();
            await expect(page.getByText(/Version \d+ is a candidate/i)).toBeVisible({
                timeout: 90_000,
            });
            await page
                .getByRole("button", { name: /accept this version|^accept$/i })
                .first()
                .click();
            await expect(page.locator("main").getByText(/^v\d+ · ACTIVE/i)).toBeVisible();

            await page.reload();
            await expect(page.getByText(/versions/i)).toBeVisible();
            await expect(page.locator("main").getByText(/^v1 · /i)).toBeVisible();
            await expect(page.locator("main").getByText(/^v\d+ · REJECTED/i)).toBeVisible();
            await expect(page.locator("main").getByText(/^v\d+ · ACTIVE/i)).toBeVisible();

            const userAPlanUrl = page.url();
            await page.getByRole("button", { name: /sign out/i }).click();
            await expect(page.getByRole("heading", { name: /sign in to reversepath/i })).toBeVisible();

            await signIn(email);
            await page.goto(userAPlanUrl);
            await expect(page.getByText(/versions/i)).toBeVisible();
            await expect(page.locator("main").getByText(/^v1 · /i)).toBeVisible();
            await expect(page.locator("main").getByText(/^v\d+ · ACTIVE/i)).toBeVisible();

            await page.getByRole("button", { name: /sign out/i }).click();
            await signIn(secondEmail);
            await page.goto(userAPlanUrl);
            await expect(page.getByRole("heading", { name: /couldn't be loaded/i })).toBeVisible();
        } finally {
            if (created.data.user?.id) await admin.auth.admin.deleteUser(created.data.user.id);
            if (secondCreated.data.user?.id) {
                await admin.auth.admin.deleteUser(secondCreated.data.user.id);
            }
        }
    });
});
