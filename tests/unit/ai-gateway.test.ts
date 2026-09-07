import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    candidatesForAlias,
    classifyAiError,
    isMockAiEnabled,
    maxProviderRetries,
    routeForAlias,
    timeoutMs,
} from "@/lib/ai-gateway.server";

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

describe("AI provider router", () => {
    beforeEach(resetEnv);
    afterEach(resetEnv);

    it("uses free-first default routes without requiring paid OpenAI", () => {
        expect(routeForAlias("FAST")).toEqual(["groq", "gemini", "openrouter", "openai"]);
        expect(routeForAlias("PRIMARY")).toEqual(["gemini", "groq", "openrouter", "openai"]);
    });

    it("builds candidates only for enabled providers with keys and configured models", () => {
        vi.stubEnv("GROQ_API_KEY", "test-groq-key");
        vi.stubEnv("GROQ_MODEL_FAST", "groq-test-model");
        vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
        vi.stubEnv("GEMINI_MODEL_FAST", "gemini-test-model");

        const candidates = candidatesForAlias("FAST");

        expect(candidates.map((candidate) => candidate.providerId)).toEqual(["groq", "gemini"]);
        expect(candidates.map((candidate) => candidate.modelId)).toEqual([
            "groq-test-model",
            "gemini-test-model",
        ]);
    });

    it("honors provider allowlist as the privacy boundary for fallback", () => {
        vi.stubEnv("AI_PROVIDER_ALLOWLIST", "gemini");
        vi.stubEnv("AI_ROUTE_PRIMARY", "gemini,openrouter,openai");
        vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
        vi.stubEnv("GEMINI_MODEL_PRIMARY", "gemini-test-model");
        vi.stubEnv("OPENROUTER_API_KEY", "test-openrouter-key");
        vi.stubEnv("OPENROUTER_MODEL_PRIMARY", "openrouter-test-model");

        expect(candidatesForAlias("PRIMARY").map((candidate) => candidate.providerId)).toEqual([
            "gemini",
        ]);
    });

    it("supports deterministic mock mode for no-cost automated tests", () => {
        vi.stubEnv("AI_PROVIDER_MODE", "mock");
        vi.stubEnv("GROQ_API_KEY", "test-groq-key");
        vi.stubEnv("GROQ_MODEL_FAST", "groq-test-model");

        expect(isMockAiEnabled()).toBe(true);
        expect(candidatesForAlias("FAST")).toEqual([]);
    });

    it("bounds timeout and retry configuration", () => {
        vi.stubEnv("AI_PROVIDER_TIMEOUT_MS", "2500");
        vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "12");

        expect(timeoutMs()).toBe(2500);
        expect(maxProviderRetries()).toBe(3);
    });

    it("classifies provider errors for fallback decisions", () => {
        expect(classifyAiError({ status: 429 }).code).toBe("AI_RATE_LIMITED");
        expect(classifyAiError({ message: "invalid JSON parse failed" }).code).toBe(
            "AI_SCHEMA_INVALID",
        );
        expect(classifyAiError({ name: "AbortError" }).code).toBe("AI_PROVIDER_TIMEOUT");
        expect(classifyAiError({ status: 403 }).code).toBe("AI_POLICY_REJECTED");
    });
});
