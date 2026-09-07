import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runIntakeAnalysis, runPlanGeneration } from "@/ai/orchestrator.server";
import { validateProposal } from "@/lib/planner.server";

const originalEnv = { ...process.env };
const aiEnvKeys = [
    "AI_PROVIDER_MODE",
    "AI_PROVIDER_ALLOWLIST",
    "AI_ROUTE_FAST",
    "AI_ROUTE_PRIMARY",
    "AI_ROUTE_CRITIC",
    "AI_ROUTE_FALLBACK",
    "AI_PROVIDER_TIMEOUT_MS",
    "AI_PROVIDER_MAX_RETRIES",
    "GEMINI_ENABLED",
    "GEMINI_API_KEY",
    "GEMINI_MODEL_DEFAULT",
    "GEMINI_MODEL_FAST",
    "GEMINI_MODEL_PRIMARY",
    "GEMINI_MODEL_CRITIC",
    "GEMINI_MODEL_FALLBACK",
    "GROQ_ENABLED",
    "GROQ_API_KEY",
    "GROQ_MODEL_DEFAULT",
    "GROQ_MODEL_FAST",
    "GROQ_MODEL_PRIMARY",
    "GROQ_MODEL_CRITIC",
    "GROQ_MODEL_FALLBACK",
    "OPENROUTER_ENABLED",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL_DEFAULT",
    "OPENROUTER_MODEL_FAST",
    "OPENROUTER_MODEL_PRIMARY",
    "OPENROUTER_MODEL_CRITIC",
    "OPENROUTER_MODEL_FALLBACK",
    "OPENAI_ENABLED",
    "OPENAI_API_KEY",
    "OPENAI_MODEL_DEFAULT",
    "OPENAI_MODEL_FAST",
    "OPENAI_MODEL_PRIMARY",
    "OPENAI_MODEL_CRITIC",
    "OPENAI_MODEL_FALLBACK",
    "LOVABLE_AI_ENABLED",
    "LOVABLE_API_KEY",
    "LOVABLE_MODEL_DEFAULT",
    "LOVABLE_MODEL_FAST",
    "LOVABLE_MODEL_PRIMARY",
    "LOVABLE_MODEL_CRITIC",
    "LOVABLE_MODEL_FALLBACK",
] as const;

function resetEnv() {
    process.env = { ...originalEnv };
    for (const key of aiEnvKeys) delete process.env[key];
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
