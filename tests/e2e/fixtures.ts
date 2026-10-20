import { test as base, expect } from "@playwright/test";
import { assertRequestedDatabaseTestsAreSafe } from "../../scripts/test-environment.mjs";
import { installPreviewAccess } from "../../scripts/preview-access.mjs";

// Public regressions must not contact Supabase, even with real values in .env.
// Individual tests may register narrower intercepted responses after this guard.
export const test = base.extend({
    page: async ({ page }, runFixture) => {
        assertRequestedDatabaseTestsAreSafe();
        await installPreviewAccess(page, process.env["PLAYWRIGHT_BASE_URL"]);
        const live = ["RUN_E2E_GOLDEN", "RUN_E2E_SIGNUP"].some(
            (name) => process.env[name] === "true",
        );
        if (!live) {
            const origins = new Set(
                ["VITE_SUPABASE_URL", "SUPABASE_URL", "SUPABASE_TEST_URL"].flatMap((name) => {
                    try {
                        return [new URL(process.env[name] ?? "").origin];
                    } catch {
                        return [];
                    }
                }),
            );
            await page.route(
                (url) => origins.has(url.origin),
                (route) =>
                    route.fulfill({
                        status: 503,
                        contentType: "application/json",
                        body: JSON.stringify({
                            code: "TEST_NETWORK_DISABLED",
                            msg: "Live Supabase is disabled for deterministic browser tests.",
                        }),
                    }),
            );
        }
        await runFixture(page);
    },
});
export { expect };
