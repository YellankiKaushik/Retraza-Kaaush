import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";
import {
    createSupabaseTestFetch,
    loadProjectEnv,
    supabaseTestUrl,
    testSecretKey,
    hasSupabaseLiveTestCredentials,
} from "../helpers/test-env";
loadProjectEnv();
test("real signup, confirmation callback, login and logout work", async ({ page, baseURL }) => {
    test.skip(
        process.env["RUN_E2E_SIGNUP"] !== "true" ||
            !hasSupabaseLiveTestCredentials() ||
            !process.env["E2E_SIGNUP_EMAIL_TEMPLATE"]?.includes("{runId}"),
        "Requires an authorized disposable mailbox template containing {runId}; does not verify inbox delivery.",
    );
    test.setTimeout(90_000);
    const key = testSecretKey()!;
    const admin = createClient(supabaseTestUrl()!, key, {
        global: { fetch: createSupabaseTestFetch(key) },
        auth: { persistSession: false },
    });
    const email = process.env["E2E_SIGNUP_EMAIL_TEMPLATE"]!.replaceAll(
        "{runId}",
        crypto.randomUUID(),
    );
    const password = "ReversePath-signup-test-12345";
    let userId: string | undefined;
    let signupAttempted = false;
    try {
        const existing = await admin.auth.admin.listUsers({ perPage: 1000 });
        expect(existing.error).toBeNull();
        expect(existing.data.users.some((user) => user.email === email)).toBe(false);
        await page.goto("/auth");
        await page.getByRole("button", { name: "No account yet? Create one" }).click();
        await page.getByLabel("Email").fill(email);
        await page.getByLabel("Password").fill(password);
        const signupResponse = page.waitForResponse(
            (response) =>
                response.url().includes("/auth/v1/signup") &&
                response.request().method() === "POST",
        );
        signupAttempted = true;
        await page.getByRole("button", { name: "Create account", exact: true }).click();
        const response = await signupResponse;
        if (!response.ok()) {
            const body = await response.json();
            throw new Error(
                `Signup rejected: HTTP ${response.status()} ${String(body.code ?? body.error_code ?? "")} ${String(body.msg ?? body.message ?? "").replace(/\S+@\S+/g, "[test email]")}`,
            );
        }
        await expect(page.getByRole("status")).toContainText("Check your email", {
            timeout: 30_000,
        });
        const users = await admin.auth.admin.listUsers({ perPage: 1000 });
        userId = users.data.users.find((u) => u.email === email)?.id;
        expect(Boolean(userId)).toBe(true);
        // The admin API retrieves a real confirmation link for this disposable
        // account; no mailbox credentials or messages to real recipients are needed.
        const link = await admin.auth.admin.generateLink({
            type: "signup",
            email,
            password,
            options: { redirectTo: new URL(baseURL!).origin },
        });
        expect(link.error).toBeNull();
        await page.goto(link.data.properties!.action_link).catch(() => {
            throw new Error("Confirmation callback navigation failed (URL withheld)");
        });
        await expect(page.getByRole("heading", { name: /your plans/i })).toBeVisible({
            timeout: 30_000,
        });
        await page.reload();
        await expect(page.getByRole("heading", { name: /your plans/i })).toBeVisible();
        await page.getByRole("button", { name: /sign out/i }).click();
        await expect(page.getByRole("heading", { name: /sign in to reversepath/i })).toBeVisible();
        await page.getByLabel("Email").fill(email);
        await page.getByLabel("Password").fill(password);
        await page.getByRole("button", { name: /^sign in$/i }).click();
        await expect(page.getByRole("heading", { name: /your plans/i })).toBeVisible();
    } finally {
        if (signupAttempted && !userId) {
            const users = await admin.auth.admin.listUsers({ perPage: 1000 });
            userId = users.data.users.find((u) => u.email === email)?.id;
        }
        if (userId) await admin.auth.admin.deleteUser(userId);
    }
});
