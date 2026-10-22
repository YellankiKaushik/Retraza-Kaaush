import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { requiredTables } from "../../scripts/shared-preflight.mjs";
import { sharedTestApproval } from "../../scripts/test-environment.mjs";
import { expect, test } from "./fixtures";

import {
    createSupabaseTestFetch,
    hasSupabaseLiveTestCredentials,
    loadProjectEnv,
    supabaseTestUrl,
    testSecretKey,
} from "../helpers/test-env";

loadProjectEnv();
const runGolden = process.env["RUN_E2E_GOLDEN"] === "true" && hasSupabaseLiveTestCredentials();
const liveMode = process.env["AI_PROVIDER_MODE"] === "live";
const requestedTimeout = Number(process.env["AI_PROVIDER_TIMEOUT_MS"]);
const providerWait =
    Number.isFinite(requestedTimeout) && requestedTimeout > 0
        ? Math.min(300_000, requestedTimeout)
        : 90_000;
// The approved zero-retry providers can be attempted sequentially.
const generationWait = providerWait * 2 + 15_000;

test.describe("optional authenticated ReversePath Golden Path", () => {
    // The live flow includes intake, planning and two replans with explanations.
    test.setTimeout(liveMode ? Math.max(480_000, generationWait * 6 + 90_000) : 180_000);

    test.skip(!runGolden, "Set RUN_E2E_GOLDEN=true with Supabase credentials to run this flow.");

    async function goldenWorkflow(page: Page, revisions: 1 | 2) {
        const essential = runGolden && sharedTestApproval()?.workflow === "essential";
        test.skip(
            revisions === 2 && essential,
            "Owner approved essential acceptance only; extended two-replan reliability is separate.",
        );
        test.skip(
            revisions === 1 &&
                process.env["RETRAZA_TEST_BACKEND_MODE"] === "controlled-shared" &&
                !essential,
            "Shared approval covers one full two-user workflow, not an additional compact run.",
        );
        test.skip(revisions === 1 && !liveMode, "The compact acceptance case requires real AI.");
        async function expectAiSuccess(
            success: ReturnType<typeof page.getByText>,
            timeout: number,
        ) {
            const error = page.locator('[data-sonner-toast][data-type="error"]');
            await expect(success.or(error).first()).toBeVisible({ timeout });
            if (await error.isVisible())
                throw new Error("AI operation failed; inspect safe server diagnostics.");
            await expect(success).toBeVisible();
        }
        const password = "ReversePath-e2e-password-12345";
        const runId = `reversepath-e2e-${process.env["RETRAZA_TEST_RUN_ID"] || crypto.randomUUID()}`;
        const email = `${runId}-a@example.test`;
        const secondEmail = `${runId}-b@example.test`;
        const url = supabaseTestUrl()!;
        const secretKey = testSecretKey()!;
        const admin = createClient(url, secretKey, {
            global: { fetch: createSupabaseTestFetch(secretKey) },
            auth: { persistSession: false, autoRefreshToken: false },
        });
        let created: Awaited<ReturnType<typeof admin.auth.admin.createUser>> | undefined;
        let secondCreated: typeof created;
        const stages: string[] = [];
        const coverage = { clarificationSaved: false, alternateStrategySelected: false };
        let initialGraph: {
            nodes: number;
            edges: number;
            strategies: number;
            recommendedMilestones: number;
            executable: number;
        } | null = null;
        try {
            created = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            });
            secondCreated = await admin.auth.admin.createUser({
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
                await expect(page.getByRole("heading", { name: /your plans/i })).toBeVisible();
            }

            await signIn(email);
            stages.push("password-sign-in");

            await page.getByRole("link", { name: /new objective/i }).click();
            await page
                .getByLabel("Your objective")
                .fill(
                    "I want to become a product manager in six months. I currently have no PM experience, I work full-time, and I can dedicate 10 hours per week.",
                );
            await page.getByRole("button", { name: /analyse objective/i }).click();

            await expectAiSuccess(
                page.getByRole("heading", { name: /product manag|PM/i }),
                generationWait,
            );
            stages.push("goal-created-and-classified");
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
                        "I have no PM experience, work full-time, and can dedicate 10 hours per week for six months.",
                    );
                }
                await page.getByRole("button", { name: /save answers/i }).click();
                await expect(page.getByText(/ready for planning/i)).toBeVisible();
                coverage.clarificationSaved = true;
            }

            await page.waitForLoadState("networkidle");
            await page.waitForTimeout(500);
            const generateButton = page.getByRole("button", { name: /generate plan/i });
            await expect(generateButton).toBeEnabled();
            await generateButton.click();
            await expectAiSuccess(page.getByText(/plan generated/i), generationWait);
            await expect(page.locator("main").getByText(/^Strategies$/)).toBeVisible();
            await expect(page.locator("main").getByText(/^Assumptions$/)).toBeVisible();
            await expect(page.locator("main").getByText(/^Risks & premortem$/)).toBeVisible();
            await expect(page.locator("main").getByText(/^Execution frontier/)).toBeVisible();
            stages.push("plan-generated-strategies-assumptions-risks-frontier-rendered");
            if (process.env["AI_PROVIDER_MODE"] === "live") {
                await expect(
                    page.getByText(/Live AI plan · (gemini|groq|openrouter|openai) · /),
                ).toBeVisible();
                const caseId = new URL(page.url()).pathname.split("/").at(-1)!;
                const plan = await admin.from("plans").select("id").eq("case_id", caseId).single();
                expect(plan.error).toBeNull();
                const version = await admin
                    .from("plan_versions")
                    .select("id")
                    .eq("plan_id", plan.data!.id)
                    .eq("state", "ACTIVE")
                    .single();
                expect(version.error).toBeNull();
                const [nodes, edges, strategies] = await Promise.all([
                    admin
                        .from("plan_nodes")
                        .select("node_type, strategy_id")
                        .eq("plan_version_id", version.data!.id),
                    admin.from("plan_edges").select("id").eq("plan_version_id", version.data!.id),
                    admin
                        .from("strategies")
                        .select("id, selected")
                        .eq("plan_version_id", version.data!.id),
                ]);
                for (const result of [nodes, edges, strategies]) expect(result.error).toBeNull();
                expect(strategies.data).toHaveLength(2);
                const recommended = strategies.data!.filter((s) => s.selected);
                expect(recommended).toHaveLength(1);
                const milestones = nodes.data!.filter(
                    (n) => n.node_type === "MILESTONE" && n.strategy_id === recommended[0]!.id,
                );
                const executable = nodes.data!.filter(
                    (n) => n.node_type === "ACTION" || n.node_type === "EXPERIMENT",
                );
                initialGraph = {
                    nodes: nodes.data!.length,
                    edges: edges.data!.length,
                    strategies: strategies.data!.length,
                    recommendedMilestones: milestones.length,
                    executable: executable.length,
                };
                expect(milestones.length).toBeGreaterThanOrEqual(3);
                expect(milestones.length).toBeLessThanOrEqual(5);
                expect(executable.length).toBeGreaterThanOrEqual(6);
                expect(executable.length).toBeLessThanOrEqual(12);
                expect(nodes.data!.length).toBeLessThanOrEqual(24);
                expect(edges.data!.length).toBeLessThanOrEqual(48);
                console.log(
                    "COMPACT_PERSISTED_GRAPH",
                    JSON.stringify({
                        nodes: nodes.data!.length,
                        edges: edges.data!.length,
                        strategies: strategies.data!.length,
                        recommendedMilestones: milestones.length,
                        executable: executable.length,
                    }),
                );
            }
            const selectedStrategy = page.locator("article").filter({
                has: page.getByRole("button", { name: "Selected", exact: true }),
            });
            const strategyName = await selectedStrategy.getByRole("heading").textContent();
            const alternate = page.getByRole("button", {
                name: "Choose this route",
                exact: true,
            });
            if (await alternate.count()) {
                await alternate.first().click();
                const original = page.locator("article").filter({
                    has: page.getByRole("heading", { name: strategyName!, exact: true }),
                });
                await expect(
                    original.getByRole("button", {
                        name: "Choose this route",
                        exact: true,
                    }),
                ).toBeEnabled();
                await original
                    .getByRole("button", { name: "Choose this route", exact: true })
                    .click();
                await expect(
                    original.getByRole("button", { name: "Selected", exact: true }),
                ).toBeDisabled();
                coverage.alternateStrategySelected = true;
            }
            await expect(page.getByRole("button", { name: /^done$/i }).first()).toBeVisible();
            const progressPanel = page
                .locator("div.panel")
                .filter({ has: page.getByText("Progress", { exact: true }) });
            const initialProgress = (await progressPanel.textContent()) ?? "";
            const numericProgress = progressPanel.getByText(/^\d+% · \d+\/\d+$/);
            const initialCounts = (await numericProgress.innerText()).match(
                /^(\d+)% · (\d+)\/(\d+)$/,
            )!;
            const expectedDone = Number(initialCounts[2]) + 1;
            const total = Number(initialCounts[3]);
            const expectedProgress = `${Math.round((expectedDone / total) * 100)}% · ${expectedDone}/${total}`;

            await page.getByRole("button", { name: "in progress", exact: true }).first().click();
            await expect(
                page.locator("main").getByText("IN_PROGRESS", { exact: true }).first(),
            ).toBeVisible();

            await page
                .getByRole("button", { name: /^done$/i })
                .first()
                .click();
            await expect(
                page
                    .locator("main")
                    .getByText(/\bDONE\b/)
                    .first(),
            ).toBeVisible();
            await expect(progressPanel).not.toHaveText(initialProgress);
            await expect(numericProgress).toHaveText(expectedProgress);
            const completedProgress = (await progressPanel.textContent()) ?? "";
            await page.reload();
            await expect(progressPanel).toHaveText(completedProgress);
            await expect(numericProgress).toHaveText(expectedProgress);

            const userAId = created.data.user!.id;
            const acceptedCompleted = await admin
                .from("plan_nodes")
                .select("id, title, node_type, metadata")
                .eq("user_id", userAId)
                .eq("status", "DONE");
            expect(acceptedCompleted.error).toBeNull();
            expect(acceptedCompleted.data!.length).toBeGreaterThan(0);
            const acceptedEvidence = await admin
                .from("actions")
                .select("plan_node_id, completed_at, result")
                .eq("user_id", userAId)
                .in(
                    "plan_node_id",
                    acceptedCompleted.data!.map((node) => node.id),
                );
            expect(acceptedEvidence.error).toBeNull();
            expect(acceptedEvidence.data!.length).toBeGreaterThan(0);

            stages.push("action-completion-progress-persisted-after-reload");
            await page
                .getByPlaceholder(/what moved/i)
                .fill("My weekly capacity dropped to three hours.");
            await page.getByPlaceholder("What changed (label)").fill("Weekly capacity");
            await page.getByPlaceholder(/new value/i).fill("3 hours per week");
            await page.getByRole("button", { name: /save check-in/i }).click();
            await expect(page.getByText(/check-in saved/i)).toBeVisible();
            stages.push("check-in-saved");

            if (revisions === 2) {
                await page
                    .getByPlaceholder(/what moved/i)
                    .fill("Capacity changed enough to resize the first path.");
                await page.getByPlaceholder("What changed (label)").fill("Weekly capacity");
                await page.getByPlaceholder(/new value/i).fill("3 hours per week");
                await page.getByRole("button", { name: /propose a revised plan/i }).click();
                await expectAiSuccess(
                    page.getByText(/Version \d+ is a candidate/i),
                    Math.max(180_000, generationWait * 2),
                );
                await expect(page.getByText(/what changed in this version/i)).toBeVisible();
                await expect(page.getByRole("button", { name: /^reject$/i }).first()).toBeVisible();
                await page
                    .getByRole("button", { name: /^reject$/i })
                    .first()
                    .click();
                await expect(page.locator("main").getByText(/^v\d+ · REJECTED/i)).toBeVisible();
                stages.push("first-replan-candidate-diff-rejected");
            }

            await page
                .getByPlaceholder(/what moved/i)
                .fill("Capacity changed enough to resize the first path.");
            await page.getByPlaceholder("What changed (label)").fill("Weekly capacity");
            await page.getByPlaceholder(/new value/i).fill("3 hours per week");
            await page.getByRole("button", { name: /propose a revised plan/i }).click();
            await expectAiSuccess(
                page.getByText(/Version \d+ is a candidate/i),
                Math.max(180_000, generationWait * 2),
            );
            await page
                .getByRole("button", { name: /accept this version|^accept$/i })
                .first()
                .click();
            await expect(page.locator("main").getByText(/^v\d+ · ACTIVE/i)).toBeVisible();
            stages.push(
                revisions === 1
                    ? "essential-replan-candidate-accepted"
                    : "second-replan-candidate-accepted",
            );

            await page.reload();
            await expect(page.getByText(/versions/i)).toBeVisible();
            await expect(page.locator("main").getByText(/^v1 · /i)).toBeVisible();
            if (revisions === 2)
                await expect(page.locator("main").getByText(/^v\d+ · REJECTED/i)).toBeVisible();
            await expect(page.locator("main").getByText(/^v\d+ · ACTIVE/i)).toBeVisible();

            const userAPlanUrl = page.url();
            const caseId = new URL(userAPlanUrl).pathname.split("/").at(-1)!;
            const savedPlan = await admin
                .from("plans")
                .select("id, active_version_id")
                .eq("case_id", caseId)
                .single();
            expect(savedPlan.error).toBeNull();
            const savedVersions = await admin
                .from("plan_versions")
                .select("id, state, version_number")
                .eq("plan_id", savedPlan.data!.id);
            expect(savedVersions.error).toBeNull();
            const activeVersions = savedVersions.data!.filter(
                (version) => version.state === "ACTIVE",
            );
            expect(activeVersions).toHaveLength(1);
            expect(activeVersions[0]!.id).toBe(savedPlan.data!.active_version_id);
            expect(activeVersions[0]!.version_number).toBe(revisions + 1);
            expect(
                savedVersions.data!.filter((version) => version.state === "REJECTED"),
            ).toHaveLength(revisions - 1);
            async function assertAcceptedProgressPreserved() {
                const completed = await admin
                    .from("plan_nodes")
                    .select("id, title, node_type, metadata")
                    .eq("user_id", userAId)
                    .eq("plan_version_id", savedPlan.data!.active_version_id!)
                    .eq("status", "DONE");
                expect(completed.error).toBeNull();
                const actions = await admin
                    .from("actions")
                    .select("plan_node_id, completed_at, result")
                    .eq("user_id", userAId)
                    .in(
                        "plan_node_id",
                        completed.data!.map((node) => node.id),
                    );
                expect(actions.error).toBeNull();
                const tempId = (node: { metadata: unknown }) =>
                    (node.metadata as Record<string, unknown>)["tempId"];
                for (const previous of acceptedCompleted.data!) {
                    const preserved = completed.data!.find(
                        (node) => tempId(node) === tempId(previous),
                    );
                    expect(preserved).toBeDefined();
                    expect(preserved!.title).toBe(previous.title);
                    expect(preserved!.node_type).toBe(previous.node_type);
                    const evidence = acceptedEvidence.data!.find(
                        (action) => action.plan_node_id === previous.id,
                    );
                    if (evidence)
                        expect(
                            actions.data!.find((action) => action.plan_node_id === preserved!.id),
                        ).toMatchObject({
                            completed_at: evidence.completed_at,
                            result: evidence.result,
                        });
                }
                const selected = await admin
                    .from("strategies")
                    .select("name")
                    .eq("user_id", userAId)
                    .eq("plan_version_id", savedPlan.data!.active_version_id!)
                    .eq("selected", true)
                    .single();
                expect(selected.error).toBeNull();
                expect(selected.data!.name).toBe(strategyName);
            }
            await assertAcceptedProgressPreserved();
            stages.push("accepted-completion-evidence-and-strategy-preserved");
            stages.push("version-history-and-single-active-pointer-verified");
            console.log(
                "PERSISTED_REVISION_INTEGRITY",
                JSON.stringify({
                    versions: savedVersions.data!.length,
                    activeVersion: activeVersions[0]!.version_number,
                    activePointerMatches: true,
                    rejected: revisions - 1,
                }),
            );
            await page.getByRole("button", { name: /sign out/i }).click();
            await expect(
                page.getByRole("heading", { name: /sign in to reversepath/i }),
            ).toBeVisible();

            await signIn(email);
            await page.goto(userAPlanUrl);
            await expect(page.getByText(/versions/i)).toBeVisible();
            await expect(page.locator("main").getByText(/^v1 · /i)).toBeVisible();
            await expect(page.locator("main").getByText(/^v\d+ · ACTIVE/i)).toBeVisible();

            await assertAcceptedProgressPreserved();
            stages.push("logout-password-relogin-persisted-state-restored");
            await page.getByRole("button", { name: /sign out/i }).click();
            await signIn(secondEmail);
            await page.goto(userAPlanUrl);
            await expect(page.getByRole("heading", { name: /couldn't be loaded/i })).toBeVisible();
            stages.push("second-user-denied-first-user-plan");
        } finally {
            if (created?.data.user?.id && process.env["AI_PROVIDER_MODE"] === "live") {
                const usage = await admin
                    .from("ai_usage_events")
                    .select(
                        "provider, model_alias, input_tokens, output_tokens, outcome, schema_valid",
                    )
                    .eq("user_id", created.data.user.id);
                if (!usage.error) {
                    console.log(
                        "LIVE_AI_TEST_USAGE",
                        JSON.stringify({
                            calls: usage.data.length,
                            inputTokens: usage.data.reduce(
                                (sum, row) => sum + (row.input_tokens ?? 0),
                                0,
                            ),
                            outputTokens: usage.data.reduce(
                                (sum, row) => sum + (row.output_tokens ?? 0),
                                0,
                            ),
                            models: [
                                ...new Set(
                                    usage.data.map((row) => `${row.provider}:${row.model_alias}`),
                                ),
                            ],
                            schemaValidated: usage.data.every(
                                (row) => row.schema_valid && row.outcome === "SUCCESS",
                            ),
                        }),
                    );
                }
            }
            const ownedUsers = [created?.data.user?.id, secondCreated?.data.user?.id].filter(
                (id): id is string => !!id,
            );
            const deletedUsers: string[] = [];
            const cleanupErrors: string[] = [];
            const remainingRecords: Record<string, number | null> = {};
            const persistedRecords: Record<string, number | null> = {};
            let aiProviders: string[] | null = null;
            let aiUsage: Record<string, unknown>[] | null = null;
            if (ownedUsers.length) {
                try {
                    const usage = await admin
                        .from("ai_usage_events")
                        .select(
                            "operation, provider, model_alias, input_tokens, output_tokens, outcome, schema_valid, correlation_id",
                        )
                        .in("user_id", ownedUsers);
                    if (!usage.error) {
                        aiUsage = usage.data;
                        aiProviders = [...new Set(usage.data.map((row) => row.provider))];
                    }
                } catch {
                    // Cleanup must still run if usage evidence cannot be read.
                }
                for (const table of requiredTables) {
                    try {
                        const result = await admin
                            .from(table)
                            .select("user_id", { count: "exact", head: true })
                            .in("user_id", ownedUsers);
                        persistedRecords[table] = result.error ? null : result.count;
                    } catch {
                        persistedRecords[table] = null;
                    }
                }
            }
            for (const id of ownedUsers) {
                try {
                    const result = await admin.auth.admin.deleteUser(id);
                    if (result.error) cleanupErrors.push("Account deletion failed: " + id);
                    else deletedUsers.push(id);
                } catch {
                    cleanupErrors.push("Account cleanup could not be verified: " + id);
                }
            }
            if (ownedUsers.length)
                for (const table of requiredTables) {
                    try {
                        const result = await admin
                            .from(table)
                            .select("user_id", { count: "exact", head: true })
                            .in("user_id", ownedUsers);
                        remainingRecords[table] = result.error ? null : result.count;
                    } catch {
                        remainingRecords[table] = null;
                    }
                }
            mkdirSync("logs", { recursive: true });
            writeFileSync(
                `logs/${runId}.json`,
                JSON.stringify(
                    {
                        runId: process.env["RETRAZA_TEST_RUN_ID"],
                        scope: liveMode ? "golden-live" : "golden-mock",
                        projectRef: new URL(url).hostname.split(".")[0],
                        completedAt: new Date().toISOString(),
                        createdUsers: ownedUsers,
                        deletedUsers,
                        cleanupErrors,
                        persistedRecords,
                        remainingRecords,
                        stages,
                        coverage,
                        aiProviders,
                        aiUsage,
                        initialGraph,
                    },
                    null,
                    2,
                ),
            );
            expect(cleanupErrors, "Current-run test account cleanup succeeded").toEqual([]);
            expect(deletedUsers).toHaveLength(ownedUsers.length);
            expect(Object.values(remainingRecords).every((count) => count === 0)).toBe(true);
            if (!liveMode && ownedUsers.length) {
                expect(aiProviders, "Mock provider usage evidence is readable").not.toBeNull();
                expect(aiProviders!.every((provider) => provider === "mock")).toBe(true);
            }
            if (liveMode && ownedUsers.length) {
                expect(aiUsage, "Live provider usage evidence is readable").not.toBeNull();
                expect(aiUsage!.length).toBeLessThanOrEqual(6);
                expect(
                    aiUsage!.every((event) =>
                        ["gemini", "groq"].includes(String(event["provider"])),
                    ),
                ).toBe(true);
            }
        }
    }
    test("authenticated user can complete the ReversePath golden path with configured AI", async ({
        page,
    }) => goldenWorkflow(page, 2));
    test("compact live workflow accepts one real revision", async ({ page }) =>
        goldenWorkflow(page, 1));
});
