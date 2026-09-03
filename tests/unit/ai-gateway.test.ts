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

function resetEnv() {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
}

describe("AI provider router", () => {
    beforeEach(resetEnv);
    afterEach(resetEnv);

    it("uses free-first default routes without requiring paid OpenAI", () => {
        expect(routeForAlias("FAST")).toEqual(["groq", "openrouter", "gemini", "openai"]);
        expect(routeForAlias("PRIMARY")).toEqual(["gemini", "openrouter", "groq", "openai"]);
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
