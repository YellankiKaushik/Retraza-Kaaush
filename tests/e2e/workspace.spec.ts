import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { test, expect } from "./fixtures";
import {
    createSupabaseTestFetch,
    loadProjectEnv,
    hasSupabaseLiveTestCredentials,
    supabaseTestUrl,
    testSecretKey,
    testPublishableKey,
} from "../helpers/test-env";

loadProjectEnv();
test.skip(
    process.env["RUN_E2E_GOLDEN"] !== "true" || !hasSupabaseLiveTestCredentials(),
    "Requires disposable Supabase fixtures.",
);

for (const mobile of [false, true]) {
    test(`workspace edits, export, refresh, quota and deletion (${mobile ? "mobile" : "desktop"})`, async ({
        page,
    }) => {
        test.setTimeout(120_000);
        const key = testSecretKey()!;
        const admin = createClient(supabaseTestUrl()!, key, {
            global: { fetch: createSupabaseTestFetch(key) },
            auth: { persistSession: false },
        });
        const email = `reversepath-workspace-${crypto.randomUUID()}@example.test`;
        const password = `ReversePath-${crypto.randomUUID()}!`;
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        expect(created.error).toBeNull();
        const userId = created.data.user!.id;
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
            if (mobile) await page.setViewportSize({ width: 390, height: 844 });
            await page.goto("/auth");
            await page.getByLabel("Email").fill(email);
            await page.getByLabel("Password").fill(password);
            await page.getByRole("button", { name: /^sign in$/i }).click();
            await expect(page.getByText("Nothing mapped yet")).toBeVisible();

            const goal = await admin
                .from("intake_cases")
                .insert({
                    user_id: userId,
                    raw_text: "Prepare a small portfolio with five weekly hours",
                    normalized_title: "Workspace audit objective",
                    status: "READY_FOR_PLANNING",
                })
                .select("id")
                .single();
            expect(goal.error).toBeNull();
            await page.goto(`/plans/${goal.data!.id}`);
            await page.getByRole("button", { name: "Edit objective" }).click();
            await page
                .getByPlaceholder("Objective title", { exact: true })
                .fill("Edited workspace objective");
            await page
                .getByPlaceholder("Desired outcome", { exact: true })
                .fill("Publish one portfolio case study");
            await page
                .getByPlaceholder("Success criteria, one per line")
                .fill("One public case study");
            await page.getByRole("button", { name: "Save objective" }).click();
            await expect(
                page.getByRole("heading", { name: "Edited workspace objective" }),
            ).toBeVisible();
            await page.getByPlaceholder("Label (e.g. weekly hours)").fill("Weekly capacity");
            await page.getByPlaceholder("Value", { exact: true }).fill("5 hours");
            await page.getByRole("button", { name: "Add", exact: true }).click();
            await expect(page.getByText("Weekly capacity: 5 hours")).toBeVisible();
            await page.reload();
            await expect(page.getByText("Weekly capacity: 5 hours")).toBeVisible();
            expect(
                await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
            ).toBe(false);

            const publicKey = testPublishableKey()!;
            const authClient = createClient(supabaseTestUrl()!, publicKey, {
                global: { fetch: createSupabaseTestFetch(publicKey) },
                auth: { persistSession: false, autoRefreshToken: false },
            });
            expect(
                (await authClient.auth.signInWithPassword({ email, password })).error,
            ).toBeNull();
            const refresh = await authClient.auth.refreshSession();
            expect(refresh.error).toBeNull();
            expect(refresh.data.user?.id).toBe(userId);
            await authClient.auth.signOut({ scope: "local" });

            await page.getByRole("link", { name: "Account", exact: true }).click();
            const downloadPromise = page.waitForEvent("download");
            await page.getByRole("button", { name: "Export my data" }).click();
            const download = await downloadPromise;
            const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
            expect(Object.keys(exported.data)).toHaveLength(12);
            expect(exported.data.intake_cases[0].normalized_title).toBe(
                "Edited workspace objective",
            );
            expect(exported.data.case_context_facts[0].value.answer).toBe("5 hours");
            await page.goto(`/plans/${goal.data!.id}`);
            await page.getByRole("button", { name: "Remove", exact: true }).click();
            await expect(page.getByText("No context recorded yet", { exact: false })).toBeVisible();

            const usage = await admin.from("ai_usage_events").insert(
                Array.from({ length: 20 }, () => ({
                    user_id: userId,
                    operation: "CLASSIFY_AND_CLARIFY",
                    provider: "mock",
                    model_alias: "FAST",
                    prompt_version: "v1",
                    outcome: "SUCCESS",
                    latency_ms: 1,
                    schema_valid: true,
                })),
            );
            expect(usage.error).toBeNull();
            await page.getByRole("link", { name: "New", exact: true }).click();
            await page
                .getByRole("textbox", { name: "Your objective" })
                .fill("Build a portfolio with five hours each week");
            await page.getByRole("button", { name: "Analyse objective" }).click();
            await expect(page.getByText(/reached the limit of \d+/)).toBeVisible();
            const remaining = await admin.from("intake_cases").select("id").eq("user_id", userId);
            expect(remaining.data).toHaveLength(1);
            expect(
                (await admin.from("ai_usage_events").select("id").eq("user_id", userId)).data,
            ).toHaveLength(20);

            await page.getByRole("link", { name: "Plans", exact: true }).click();
            await expect(page.getByText("Edited workspace objective")).toBeVisible();
            page.once("dialog", (dialog) => dialog.accept());
            await page.getByRole("button", { name: "Delete", exact: true }).click();
            await expect(page.getByText("Nothing mapped yet")).toBeVisible();
            await page.getByRole("button", { name: "Sign out", exact: true }).click();
            await page.goto("/settings");
            await expect(
                page.getByRole("heading", { name: "Sign in to ReversePath" }),
            ).toBeVisible();
            await page.getByLabel("Email").fill(email);
            await page.getByLabel("Password").fill(password);
            await page.getByRole("button", { name: /^sign in$/i }).click();
            await expect(page.getByText("Nothing mapped yet")).toBeVisible();
            await page.evaluate(() => {
                const key = Object.keys(localStorage).find((name) =>
                    /^sb-.*-auth-token$/.test(name),
                );
                if (!key) throw new Error("Expected browser session");
                const session = JSON.parse(localStorage.getItem(key)!);
                session.expires_at = 1;
                session.refresh_token = crypto.randomUUID();
                localStorage.setItem(key, JSON.stringify(session));
            });
            await page.goto("/settings");
            await expect(
                page.getByRole("heading", { name: "Sign in to ReversePath" }),
            ).toBeVisible();
            expect(errors).toEqual([]);
        } finally {
            expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
        }
    });
}
