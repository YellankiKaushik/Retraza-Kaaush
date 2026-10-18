import { afterEach, expect, it, vi } from "vitest";

import { runIntakeAnalysis, runPlanGeneration } from "@/ai/orchestrator.server";
import { computeFrontier, progressOf } from "@/domain/frontier";
import { validateProposal } from "@/lib/planner.server";
import { loadProjectEnv } from "../helpers/test-env";

loadProjectEnv();
afterEach(() => vi.unstubAllEnvs());

it.skipIf(process.env["RUN_LIVE_DEMO_PLAN"] !== "true")(
    "live PM demo intake and plan satisfy the application contracts and have executable work",
    async () => {
        vi.stubEnv("AI_PROVIDER_MODE", "live");
        vi.stubEnv("AI_PROVIDER_ALLOWLIST", "groq,gemini");
        vi.stubEnv("AI_ROUTE_FAST", "groq,gemini");
        vi.stubEnv("AI_ROUTE_PRIMARY", "gemini,groq");
        vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "0");
        vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "8000");

        const rawText = "I want to become a product manager in six months. I currently have no PM experience, I work full-time, and I can dedicate 10 hours per week.";
        const correlationId = crypto.randomUUID();
        const intake = await runIntakeAnalysis({ rawText, correlationId });
        expect(intake.meta.provider).not.toBe("mock");
        expect(intake.data.policy.supported).toBe(true);

        const result = await runPlanGeneration({
            rawText,
            intentType: intake.data.intentType,
            objective: intake.data.normalizedObjective,
            facts: [
                { category: "CONSTRAINT", key: "availability", value: "10 hours per week while working full-time" },
                { category: "FACT", key: "experience", value: "No PM experience" },
            ],
            scenario: "BALANCED",
            correlationId,
        });
        expect(result.meta.provider).not.toBe("mock");
        const { nodes, edges } = validateProposal(result.data);
        expect(result.data.strategies.length).toBeGreaterThan(0);
        expect(result.data.assumptions.length).toBeGreaterThan(0);
        expect(result.data.risks.length).toBeGreaterThan(0);
        expect(nodes.some((node) => node.node_type === "MILESTONE")).toBe(true);
        expect(computeFrontier(nodes, edges).ready.length).toBeGreaterThan(0);
        expect(progressOf(nodes).total).toBeGreaterThan(0);
        for (const call of [intake, result]) {
            console.info(`${call.meta.operation}: ${call.meta.provider}; input tokens=${call.meta.inputTokens}; output tokens=${call.meta.outputTokens}`);
        }
    },
    180_000,
);
