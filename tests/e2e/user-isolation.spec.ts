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
test("denied cross-user plan stops loading and shows an error", async ({ page }) => {
    test.skip(
        process.env["RUN_E2E_GOLDEN"] !== "true" || !hasSupabaseLiveTestCredentials(),
        "Requires disposable Supabase fixtures.",
    );
    test.setTimeout(60_000);
    const key = testSecretKey()!;
    const admin = createClient(supabaseTestUrl()!, key, {
        global: { fetch: createSupabaseTestFetch(key) },
        auth: { persistSession: false },
    });
    const users: string[] = [];
    const password = "ReversePath-isolation-test-12345";
    const email = `reversepath-isolation-${crypto.randomUUID()}@example.test`;
    try {
        await page.setViewportSize({ width: 390, height: 844 });
        const a = await admin.auth.admin.createUser({
            email: `owner-${email}`,
            password,
            email_confirm: true,
        });
        expect(a.error).toBeNull();
        users.push(a.data.user!.id);
        const b = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        expect(b.error).toBeNull();
        users.push(b.data.user!.id);
        const goal = await admin
            .from("intake_cases")
            .insert({
                user_id: users[0],
                raw_text: "Private regression test objective",
                normalized_title: "PRIVATE OWNER OBJECTIVE",
            })
            .select("id")
            .single();
        expect(goal.error).toBeNull();
        await page.goto("/auth");
        await page.getByLabel("Email").fill(email);
        await page.getByLabel("Password").fill(password);
        await page.getByRole("button", { name: /^sign in$/i }).click();
        await expect(page.getByRole("heading", { name: /your plans/i })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
            false,
        );
        await page.goto(`/plans/${goal.data!.id}`);
        await expect(page.getByRole("heading", { name: /couldn't be loaded/i })).toBeVisible({
            timeout: 15_000,
        });
        await expect(page.getByText("PRIVATE OWNER OBJECTIVE")).toHaveCount(0);
    } finally {
        for (const id of users) await admin.auth.admin.deleteUser(id);
    }
});
