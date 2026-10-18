import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { mockPlanProposal } from "../../src/ai/mock-provider.server";
import { persistProposal } from "../../src/lib/planner.server";
import { computeFrontier, executionNodesForStrategy } from "../../src/domain/frontier";
import type { GraphNode, GraphEdge } from "../../src/domain/types";

const owner = "00000000-0000-4000-8000-000000000001";
const caseId = "00000000-0000-4000-8000-000000000002";

// Synthetic browser session only. Every auth and server-function request is intercepted.
async function session(page: Page) {
    const url = process.env["VITE_SUPABASE_URL"] || "http://127.0.0.1:54321";
    const ref = new URL(url).hostname.split(".")[0];
    await page.addInitScript(
        ({ ref, owner }) => {
            if (sessionStorage.getItem("seeded")) return;
            const exp = Math.floor(Date.now() / 1000) + 3600;
            const user = {
                id: owner,
                email: "local-owner@example.test",
                aud: "authenticated",
                role: "authenticated",
                app_metadata: {},
                user_metadata: {},
                created_at: "2026-01-01T00:00:00Z",
            };
            const token = [
                btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })),
                btoa(
                    JSON.stringify({
                        sub: owner,
                        exp,
                        aud: "authenticated",
                        role: "authenticated",
                    }),
                ),
                "synthetic-test-signature",
            ].join(".");
            localStorage.setItem(
                `sb-${ref}-auth-token`,
                JSON.stringify({
                    access_token: token,
                    refresh_token: "synthetic-refresh",
                    token_type: "bearer",
                    expires_in: 3600,
                    expires_at: exp,
                    user,
                }),
            );
            sessionStorage.setItem("seeded", "true");
        },
        { ref, owner },
    );
    await page.route("**/auth/v1/**", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: owner, email: "local-owner@example.test" }),
        }),
    );
}

async function rpc(page: Page, answer: (method: string) => unknown | Promise<unknown>) {
    await page.route("**/_serverFn/**", async (route) => {
        const result = await answer(route.request().method());
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ result, context: {} }),
        });
    });
}
const summary = {
    id: caseId,
    title: "Local PM objective",
    rawText: "Become a product manager with ten hours per week",
    intentType: "GOAL",
    status: "READY_FOR_PLANNING",
    clarityScore: 80,
    createdAt: "2026-01-01",
    planId: null,
    activeVersionId: null,
};
function bundle() {
    return {
        generationMode: "mock",
        case: {
            id: caseId,
            rawText: summary.rawText,
            title: summary.title,
            desiredOutcome: "Build PM evidence",
            intentType: "GOAL",
            intentConfidence: 0.9,
            successCriteria: ["Publish a portfolio"],
            timeHorizon: "Six months",
            clarityScore: 80,
            questions: [],
            policyFlags: [],
            status: "READY_FOR_PLANNING",
            createdAt: "2026-01-01",
        },
        facts: [],
        plan: null,
    };
}

async function plannedBundle() {
    type Row = Record<string, unknown>;
    type Payload = {
        version: Row;
        strategies: Row[];
        plan_nodes: Row[];
        plan_edges: Row[];
        actions: Row[];
        assumptions: Row[];
        risks: Row[];
        bottleneckId: string;
        bottleneckReason: string;
    };
    let payload!: Payload;
    await persistProposal({
        supabase: {
            rpc: async (_name: string, args: { payload: unknown }) => {
                payload = args.payload as Payload;
                return { data: { versionId: "v1", versionNumber: 1 }, error: null };
            },
        } as never,
        userId: owner,
        planId: "plan",
        caseId,
        proposal: mockPlanProposal({ rawText: summary.rawText }),
        scenario: "BALANCED",
        parentVersionId: null,
        versionNumber: 1,
        modelAlias: "PRIMARY",
        promptVersion: "local-ui-fixture",
        activate: true,
        generationSource: { provider: "mock", model: "deterministic" },
    });
    const version = {
        ...payload.version,
        id: "v1",
        state: "ACTIVE",
        version_number: 1,
        bottleneck_node_id: payload.bottleneckId,
        bottleneck_reason: payload.bottleneckReason,
        created_at: "2026-01-01",
    };
    return {
        ...bundle(),
        plan: {
            id: "plan",
            status: "ACTIVE",
            activeVersionId: "v1",
            version,
            versions: [version],
            nodes: payload.plan_nodes,
            edges: payload.plan_edges.map((row, id) => ({ ...row, id: String(id) })),
            actions: payload.actions.map((row) => ({ ...row, revision: 1 })),
            strategies: payload.strategies,
            assumptions: payload.assumptions.map((row, id) => ({
                ...row,
                id: String(id),
                status: "UNVALIDATED",
            })),
            risks: payload.risks.map((row, id) => ({ ...row, id: String(id), status: "OPEN" })),
            changes: [],
            checkIns: [],
        },
    };
}

test("dashboard deletion is confirmed, pending and reflected without a remote write", async ({
    page,
}) => {
    await session(page);
    let deleted = false;
    let writes = 0;
    await rpc(page, async (method) => {
        if (method === "POST") {
            writes++;
            await new Promise((resolve) => setTimeout(resolve, 200));
            deleted = true;
            return { ok: true };
        }
        return deleted ? [] : [summary];
    });
    await page.goto("/");
    await expect(page.getByText(summary.title)).toBeVisible();
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    expect(writes).toBe(0);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("button", { name: "Deleting" })).toBeDisabled();
    await expect(page.getByText("Nothing mapped yet")).toBeVisible();
    expect(writes).toBe(1);
});

test("intake disables duplicate submissions and navigates to its saved objective", async ({
    page,
}) => {
    await session(page);
    let writes = 0;
    await rpc(page, async (method) => {
        if (method === "POST") {
            writes++;
            await new Promise((resolve) => setTimeout(resolve, 500));
            return { caseId, status: "READY_FOR_PLANNING" };
        }
        return bundle();
    });
    await page.goto("/new");
    await expect(page.getByRole("link", { name: "Account", exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Your objective" }).fill(summary.rawText);
    await page.getByRole("button", { name: "Analyse objective" }).click();
    await expect(page.getByRole("button", { name: /reading your objective/i })).toBeDisabled();
    await expect(page.getByRole("heading", { name: summary.title })).toBeVisible();
    expect(writes).toBe(1);
});

for (const width of [1440, 768, 390]) {
    test(`authenticated local workspace/settings fit ${width}px`, async ({ page }, info) => {
        await session(page);
        await page.setViewportSize({ width, height: 1000 });
        await rpc(page, () => bundle());
        await page.goto(`/plans/${caseId}`);
        await expect(page.getByRole("heading", { name: summary.title })).toBeVisible();
        await expect(page.getByRole("button", { name: /generate plan/i })).toBeEnabled();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page.screenshot({ path: info.outputPath("workspace.png"), fullPage: true });
        await page.getByRole("link", { name: "Account", exact: true }).click();
        await expect(page.getByText("local-owner@example.test")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page.screenshot({ path: info.outputPath("settings.png"), fullPage: true });
    });
}

test("remote logout failure clears the local session but never claims global success", async ({
    page,
}) => {
    await session(page);
    await page.route("**/auth/v1/logout**", (route) =>
        route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Synthetic outage" }),
        }),
    );
    await page.goto("/settings");
    await expect(page.getByText("local-owner@example.test")).toBeVisible();
    await page.getByRole("button", { name: "Sign out", exact: true }).last().click();
    await expect(page.getByText(/server sign-out could not be confirmed/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole("heading", { name: "Sign in to ReversePath" })).toBeVisible();
});

for (const width of [1440, 768, 390]) {
    test(`full graph workspace renders and completes an intercepted action at ${width}px`, async ({
        page,
    }, info) => {
        await session(page);
        await page.setViewportSize({ width, height: 1000 });
        const data = await plannedBundle();
        const selected = data.plan.strategies.find((row) => row.selected)?.id as string;
        const ready = computeFrontier(
            executionNodesForStrategy(
                data.plan.nodes as unknown as GraphNode[],
                data.plan.edges as unknown as GraphEdge[],
                selected,
            ),
            data.plan.edges as unknown as GraphEdge[],
        ).ready[0]!;
        let writes = 0;
        await rpc(page, (method) => {
            if (method === "POST") {
                writes++;
                data.plan.nodes.find((row) => row.id === ready.node.id)!.status = "DONE";
                return { ok: true };
            }
            return data;
        });
        await page.goto(`/plans/${caseId}`);
        await expect(page.getByText("Execution frontier", { exact: false })).toBeVisible();
        await expect(page.getByText("Balanced path", { exact: true })).toBeVisible();
        await expect(page.getByText("Current bottleneck", { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page.screenshot({ path: info.outputPath("full-workspace.png"), fullPage: true });
        await page.getByRole("button", { name: "done", exact: true }).first().click();
        await expect(page.getByText(/% · 1\//)).toBeVisible();
        expect(writes).toBe(1);
        await page.reload();
        await expect(page.getByText(/% · 1\//)).toBeVisible();
    });
}

test("account switching never renders the previous user's dashboard cache", async ({ page }) => {
    await session(page);
    let switched = false;
    await rpc(page, () => (switched ? [] : [summary]));
    await page.goto("/");
    await expect(page.getByText(summary.title)).toBeVisible();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/auth$/);
    await page.route("**/auth/v1/token**", (route) => {
        switched = true;
        const id = "00000000-0000-4000-8000-000000000003";
        const exp = Math.floor(Date.now() / 1000) + 3600;
        const token = [
            Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
            Buffer.from(
                JSON.stringify({ sub: id, exp, aud: "authenticated", role: "authenticated" }),
            ).toString("base64url"),
            "synthetic-test-signature",
        ].join(".");
        return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                access_token: token,
                refresh_token: "synthetic-second-refresh",
                token_type: "bearer",
                expires_in: 3600,
                expires_at: exp,
                user: {
                    id,
                    email: "second-local@example.test",
                    aud: "authenticated",
                    role: "authenticated",
                    app_metadata: {},
                    user_metadata: {},
                    created_at: "2026-01-01",
                },
            }),
        });
    });
    await page.getByLabel("Email").fill("second-local@example.test");
    await page.getByLabel("Password").fill("Synthetic-password-123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Nothing mapped yet")).toBeVisible();
    await expect(page.getByText(summary.title)).toHaveCount(0);
});

test("export failure never emits a download or success toast", async ({ page }) => {
    await session(page);
    await page.route("**/_serverFn/**", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                error: { message: "Your data export could not be completed." },
                context: {},
            }),
        }),
    );
    let downloads = 0;
    page.on("download", () => downloads++);
    await page.goto("/settings");
    await expect(page.getByText("local-owner@example.test")).toBeVisible();
    await page.getByRole("button", { name: "Export my data" }).click();
    await expect(page.getByText("Your data export could not be completed.")).toBeVisible();
    await expect(page.getByText("Export downloaded.")).toHaveCount(0);
    expect(downloads).toBe(0);
    await expect(page.getByRole("button", { name: "Export my data" })).toBeEnabled();
});
