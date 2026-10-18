import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";
import { computeFrontier, findHardCycle } from "../../src/domain/frontier";
import type { GraphNode, GraphEdge } from "../../src/domain/types";
import {
    createSupabaseTestFetch,
    loadProjectEnv,
    supabaseTestUrl,
    testSecretKey,
    hasSupabaseLiveTestCredentials,
} from "../helpers/test-env";
loadProjectEnv();

const scenarios = [
    {
        name: "Career",
        goal: "I want to become a product manager in six months. I work full-time and can study ten hours per week.",
        relevance: /product|manager|PM|career/i,
        answer: "I have no PM experience, work in customer support, can study ten hours per week, have a $100 total budget, and want an associate PM role in six months.",
    },
    {
        name: "Startup",
        goal: "I want to launch a SaaS startup in three months with limited technical knowledge and a small budget.",
        relevance: /SaaS|startup|customer|launch|MVP/i,
        answer: "I can spend $150 total and ten hours per week. I know basic spreadsheets but cannot code. I want to validate appointment scheduling software for independent tutors and get three paying users in three months.",
    },
    {
        name: "Learning",
        goal: "I want to learn Python and machine learning in six months while managing my college coursework.",
        relevance: /python|machine|learning|ML/i,
        answer: "I am a beginner with basic algebra, can study five hours per week around college exams, have no paid course budget, and want to build and explain one simple ML project in six months.",
    },
];
for (const scenario of scenarios) {
    test(`${scenario.name} goal produces a relevant live saved plan`, async ({ page }) => {
        test.setTimeout(300_000);
        test.skip(
            process.env["RUN_E2E_SCENARIOS"] !== "true" || !hasSupabaseLiveTestCredentials(),
            "Opt-in real planning scenarios.",
        );
        const key = testSecretKey()!;
        const admin = createClient(supabaseTestUrl()!, key, {
            global: { fetch: createSupabaseTestFetch(key) },
            auth: { persistSession: false },
        });
        const email = `reversepath-scenario-${crypto.randomUUID()}@example.test`;
        const password = "ReversePath-scenario-test-12345";
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        expect(created.error).toBeNull();
        const userId = created.data.user!.id;
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        try {
            if (scenario.name === "Learning")
                await page.setViewportSize({ width: 390, height: 844 });
            await page.goto("/auth");
            await page.getByLabel("Email").fill(email);
            await page.getByLabel("Password").fill(password);
            await page.getByRole("button", { name: /^sign in$/i }).click();
            await expect(page.getByRole("heading", { name: /your plans/i })).toBeVisible();
            await page.getByRole("link", { name: /new objective/i }).click();
            await page.getByRole("textbox", { name: "Your objective" }).fill(scenario.goal);
            await page.getByRole("button", { name: /analyse objective/i }).click();
            await expect(page.getByRole("heading", { level: 1 })).toContainText(
                scenario.relevance,
                { timeout: 120_000 },
            );
            const save = page.getByRole("button", { name: /save answers/i });
            if (await save.isVisible()) {
                const inputs = save.locator("xpath=../..").locator("input");
                for (let i = 0; i < (await inputs.count()); i++)
                    await inputs.nth(i).fill(scenario.answer);
                await save.click();
                await expect(page.getByText(/ready for planning/i)).toBeVisible();
            }
            await page.getByRole("button", { name: /generate plan/i }).click();
            await expect(page.getByText(/plan generated/i)).toBeVisible({ timeout: 150_000 });
            await expect(page.getByText(/Live AI plan · gemini ·/)).toBeVisible();
            const cases = await admin.from("intake_cases").select("id").eq("user_id", userId);
            expect(cases.data).toHaveLength(1);
            const plan = await admin
                .from("plans")
                .select("id, active_version_id")
                .eq("user_id", userId)
                .single();
            expect(plan.error).toBeNull();
            const versionId = plan.data!.active_version_id!;
            const nodes = await admin
                .from("plan_nodes")
                .select("*")
                .eq("plan_version_id", versionId);
            const edges = await admin
                .from("plan_edges")
                .select("*")
                .eq("plan_version_id", versionId);
            expect(nodes.error).toBeNull();
            expect(edges.error).toBeNull();
            const graphNodes = nodes.data as GraphNode[];
            const graphEdges = edges.data as GraphEdge[];
            expect(graphNodes.filter((n) => n.node_type === "OBJECTIVE")).toHaveLength(1);
            expect(findHardCycle(graphNodes, graphEdges)).toBeNull();
            expect(JSON.stringify(graphNodes)).toMatch(scenario.relevance);
            const strategies = await admin
                .from("strategies")
                .select("id, selected")
                .eq("plan_version_id", versionId);
            const selected = strategies.data!.find((s) => s.selected)!.id;
            expect(
                computeFrontier(
                    graphNodes.filter((n) => !n.strategy_id || n.strategy_id === selected),
                    graphEdges,
                ).ready.length,
            ).toBeGreaterThan(0);
            const actions = await admin
                .from("actions")
                .select("completion_criteria")
                .eq("user_id", userId);
            expect(actions.data!.every((a) => a.completion_criteria.trim().length > 0)).toBe(true);
            await page.reload();
            await expect(page.getByText(/Live AI plan · gemini ·/)).toBeVisible();
            await expect(page.getByRole("button", { name: /^done$/i }).first()).toBeVisible();
            const progressPanel = page
                .locator("div.panel")
                .filter({ has: page.getByText("Progress", { exact: true }) });
            const initialProgress = (await progressPanel.textContent()) ?? "";
            await page
                .getByRole("button", { name: /^done$/i })
                .first()
                .click();
            await expect(progressPanel).not.toHaveText(initialProgress);
            const completedProgress = (await progressPanel.textContent()) ?? "";
            const completedActions = await admin
                .from("actions")
                .select("id, completed_at")
                .eq("user_id", userId)
                .not("completed_at", "is", null);
            expect(completedActions.error).toBeNull();
            expect(completedActions.data!.length).toBeGreaterThan(0);
            await page.reload();
            await expect(progressPanel).toHaveText(completedProgress);
            await expect(page.getByText(/Live AI plan · gemini ·/)).toBeVisible();
            await page.setViewportSize({ width: 390, height: 844 });
            await expect(progressPanel).toBeVisible();
            expect(
                await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
            ).toBe(false);
            expect(errors).toEqual([]);
        } finally {
            const usage = await admin
                .from("ai_usage_events")
                .select("input_tokens, output_tokens, outcome, schema_valid, latency_ms")
                .eq("user_id", userId);
            console.log(
                "SCENARIO_AI_USAGE",
                JSON.stringify({
                    scenario: scenario.name,
                    calls: usage.data?.length,
                    inputTokens: usage.data?.reduce((s, r) => s + (r.input_tokens ?? 0), 0),
                    outputTokens: usage.data?.reduce((s, r) => s + (r.output_tokens ?? 0), 0),
                    successful: usage.data?.every((r) => r.outcome === "SUCCESS" && r.schema_valid),
                    outcomes: usage.data?.map((r) => r.outcome),
                    latencyMs: usage.data?.map((r) => r.latency_ms),
                }),
            );
            await admin.auth.admin.deleteUser(userId);
        }
    });
}
