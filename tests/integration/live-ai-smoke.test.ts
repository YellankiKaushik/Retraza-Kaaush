import { describe, expect, it, vi } from "vitest";

import { runIntakeAnalysis } from "@/ai/orchestrator.server";
import type { ProviderId } from "@/lib/ai-gateway.server";

const PROVIDERS: Array<{ id: ProviderId; keyEnv: string; modelEnv: string }> = [
    { id: "gemini", keyEnv: "GEMINI_API_KEY", modelEnv: "GEMINI_MODEL_FAST" },
    { id: "groq", keyEnv: "GROQ_API_KEY", modelEnv: "GROQ_MODEL_FAST" },
    { id: "openrouter", keyEnv: "OPENROUTER_API_KEY", modelEnv: "OPENROUTER_MODEL_FAST" },
    { id: "openai", keyEnv: "OPENAI_API_KEY", modelEnv: "OPENAI_MODEL_FAST" },
];

const runLiveSmoke = process.env["RUN_LIVE_AI_SMOKE"] === "true";

describe("optional live AI provider smoke", () => {
    for (const provider of PROVIDERS) {
        it.skipIf(
            !runLiveSmoke || !process.env[provider.keyEnv] || !process.env[provider.modelEnv],
        )(
            `${provider.id} returns schema-valid intake analysis`,
            async () => {
                vi.stubEnv("AI_PROVIDER_MODE", "live");
                vi.stubEnv("AI_PROVIDER_ALLOWLIST", provider.id);
                vi.stubEnv("AI_ROUTE_FAST", provider.id);

                const result = await runIntakeAnalysis({
                    rawText: "I want to improve my weekly planning without adding more meetings.",
                    correlationId: `live-smoke-${provider.id}`,
                });

                expect(result.meta.provider).toBe(
                    provider.id === "lovable-ai" ? "lovable-ai" : provider.id,
                );
                expect(result.meta.schemaValid).toBe(true);
                expect(result.data.normalizedObjective.title.length).toBeGreaterThan(0);
            },
            120_000,
        );
    }
});
