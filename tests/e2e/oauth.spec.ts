import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";
import {
    createSupabaseTestFetch,
    hasSupabaseLiveTestCredentials,
    loadProjectEnv,
    supabaseTestUrl,
    testSecretKey,
    testPublishableKey,
} from "../helpers/test-env";

loadProjectEnv();
// Callback credentials must never be recorded in a browser trace.
test.use({ trace: "off", screenshot: "off", video: "off" });

for (const callback of [
    "?error=access_denied&error_description=private-provider-detail",
    "#error=access_denied&error_description=private-provider-detail",
    "?code=invalid-without-verifier",
    "#access_token=invalid-callback",
]) {
    test(`callback failure is visible and sanitized (${callback.startsWith("?") ? "query" : "fragment"} ${callback.includes("error=") ? "error" : "incomplete"})`, async ({
        page,
    }) => {
        await page.goto("/auth" + callback);
        await expect(page.getByRole("alert")).toContainText("Sign-in could not be completed");
        await expect(page.getByRole("alert")).not.toContainText("private-provider-detail");
        expect(new URL(page.url()).search === "" && new URL(page.url()).hash === "").toBe(true);
        await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    });
}

test("Google initiation reaches the real provider with an origin-specific auth return", async ({
    page,
    baseURL,
}) => {
    test.skip(
        process.env["RUN_E2E_GOLDEN"] !== "true",
        "Requires the real configured Google provider.",
    );
    await page.goto("/auth");
    const request = page.waitForRequest(
        (url) => new URL(url.url()).pathname === "/auth/v1/authorize",
    );
    await page.getByRole("button", { name: "Continue with Google" }).click();
    const url = new URL((await request).url());
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("redirect_to")).toBe(new URL("/auth", baseURL!).href);
    await page.waitForURL((url) => url.hostname === "accounts.google.com");
    expect(new URL(page.url()).hostname === "accounts.google.com").toBe(true);
});

test("real Supabase callback session persists, signs out, and keeps password login working", async ({
    page,
    baseURL,
}) => {
    test.skip(
        process.env["RUN_E2E_GOLDEN"] !== "true" || !hasSupabaseLiveTestCredentials(),
        "Requires disposable Supabase account.",
    );
    test.setTimeout(60_000);
    const key = testSecretKey()!;
    const admin = createClient(supabaseTestUrl()!, key, {
        global: { fetch: createSupabaseTestFetch(key) },
        auth: { persistSession: false },
    });
    const email = `reversepath-oauth-session-${crypto.randomUUID()}@example.com`;
    const password = `ReversePath-${crypto.randomUUID()}!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user)
        throw new Error("Disposable callback account could not be created");
    const publicKey = testPublishableKey()!;
    const client = createClient(supabaseTestUrl()!, publicKey, {
        global: { fetch: createSupabaseTestFetch(publicKey) },
        auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
        const signedIn = await client.auth.signInWithPassword({ email, password });
        const session = signedIn.data.session;
        if (!session) throw new Error("Disposable session could not be created");
        const hash = new URLSearchParams({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: String(session.expires_in),
            token_type: session.token_type,
        });
        // Real SDK/user validation + storage, not a mocked Google account exchange.
        await page.goto(new URL("/auth", baseURL!).href + "#" + hash).catch(() => {
            throw new Error("Session callback navigation failed (URL withheld)");
        });
        await expect(page.getByRole("heading", { name: "Your plans" })).toBeVisible();
        expect(new URL(page.url()).pathname === "/" && new URL(page.url()).hash === "").toBe(true);
        await page.reload();
        await expect(page.getByRole("heading", { name: "Your plans" })).toBeVisible();
        await page.getByRole("button", { name: "Sign out" }).click();
        await expect(page.getByRole("heading", { name: "Sign in to ReversePath" })).toBeVisible();
        await page.reload();
        await expect(page.getByRole("heading", { name: "Sign in to ReversePath" })).toBeVisible();
        await page.getByLabel("Email").fill(email);
        await page.getByLabel("Password").fill(password);
        await page.getByRole("button", { name: /^sign in$/i }).click();
        await expect(page.getByRole("heading", { name: "Your plans" })).toBeVisible();
    } finally {
        await client.auth.signOut();
        const deleted = await admin.auth.admin.deleteUser(created.data.user.id);
        expect(!deleted.error, "Disposable callback account cleanup succeeded").toBe(true);
    }
});
