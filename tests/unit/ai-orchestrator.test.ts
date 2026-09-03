import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runIntakeAnalysis, runPlanGeneration } from "@/ai/orchestrator.server";
import { validateProposal } from "@/lib/planner.server";

const originalEnv = { ...process.env };

function resetEnv() {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
}

describe("AI orchestrator", () => {
    beforeEach(resetEnv);
    afterEach(resetEnv);

    it("runs deterministic mock classification without external provider keys", async () => {
        vi.stubEnv("AI_PROVIDER_MODE", "mock");

        const result = await runIntakeAnalysis({
            rawText: "I want to improve my weekly planning.",
            correlationId: "test-correlation",
        });

        expect(result.data.intentType).toBe("GOAL");
        expect(result.meta.provider).toBe("mock");
        expect(result.meta.schemaValid).toBe(true);
    });

    it("runs deterministic mock planning through the same validated plan contract", async () => {
        vi.stubEnv("AI_PROVIDER_MODE", "mock");

        const result = await runPlanGeneration({
            rawText: "I want to build a better portfolio.",
            intentType: "GOAL",
            objective: {
                title: "Build a better portfolio",
                desiredOutcome: "Publish a focused portfolio with one strong case study.",
                successCriteria: ["One case study is public"],
            },
            facts: [],
            scenario: "BALANCED",
            strategyPreference: null,
            correlationId: "test-correlation",
        });

        expect(() => validateProposal(result.data)).not.toThrow();
        expect(result.data.edges.some((edge) => edge.hardDependency)).toBe(true);
        expect(result.meta.provider).toBe("mock");
    });

    it("returns a graceful unavailable error when no live provider is configured", async () => {
        vi.stubEnv("AI_PROVIDER_MODE", "live");
        vi.stubEnv("AI_PROVIDER_ALLOWLIST", "gemini");

        await expect(
            runIntakeAnalysis({
                rawText: "I want to build a better portfolio.",
                correlationId: "test-correlation",
            }),
        ).rejects.toMatchObject({
            code: "AI_UNAVAILABLE",
            retryable: false,
        });
    });
});
