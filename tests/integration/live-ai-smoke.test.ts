import { generateObject } from "ai";
import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import { candidatesForAlias, type ProviderId } from "@/lib/ai-gateway.server";
import { loadProjectEnv } from "../helpers/test-env";

const PROVIDERS: Array<{
    id: ProviderId;
    keyEnv: string;
    fastModelEnv: string;
    defaultModelEnv: string;
}> = [
    {
        id: "gemini",
        keyEnv: "GEMINI_API_KEY",
        fastModelEnv: "GEMINI_MODEL_FAST",
        defaultModelEnv: "GEMINI_MODEL_DEFAULT",
    },
    {
        id: "groq",
        keyEnv: "GROQ_API_KEY",
        fastModelEnv: "GROQ_MODEL_FAST",
        defaultModelEnv: "GROQ_MODEL_DEFAULT",
    },
    {
        id: "openrouter",
        keyEnv: "OPENROUTER_API_KEY",
        fastModelEnv: "OPENROUTER_MODEL_FAST",
        defaultModelEnv: "OPENROUTER_MODEL_DEFAULT",
    },
];

loadProjectEnv();
const runLiveSmoke = process.env["RUN_LIVE_AI_SMOKE"] === "true";
const smokeSchema = z.object({ ok: z.literal(true) });

afterEach(() => {
    vi.unstubAllEnvs();
});

function isOptionalOpenRouterUnavailable(providerId: ProviderId, error: unknown) {
    if (providerId !== "openrouter") return false;
    const anyError = error as { statusCode?: number; status?: number; message?: string } | undefined;
    const status = anyError?.statusCode ?? anyError?.status;
    return status === 401 || /missing authentication|unauthorized/i.test(anyError?.message ?? "");
}

describe("optional live AI provider smoke", () => {
    for (const provider of PROVIDERS) {
        it.skipIf(
            !runLiveSmoke ||
                !process.env[provider.keyEnv] ||
                (!process.env[provider.fastModelEnv] && !process.env[provider.defaultModelEnv]),
        )(
            `${provider.id} returns a minimal schema-valid response`,
            async () => {
                vi.stubEnv("AI_PROVIDER_MODE", "live");
                vi.stubEnv("AI_PROVIDER_ALLOWLIST", provider.id);
                vi.stubEnv("AI_ROUTE_FAST", provider.id);
                vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "0");
                vi.stubEnv("AI_PROVIDER_TIMEOUT_MS", "30000");

                const [candidate] = candidatesForAlias("FAST");
                expect(candidate?.providerId).toBe(provider.id);

                let result: Awaited<ReturnType<typeof generateObject<typeof smokeSchema>>>;
                try {
                    result = await generateObject({
                        model: candidate!.model,
                        schema: smokeSchema,
                        system: "Return the requested JSON object.",
                        prompt: "Set ok to true.",
                        maxRetries: 0,
                        abortSignal: AbortSignal.timeout(30_000),
                    });
                } catch (error) {
                    if (isOptionalOpenRouterUnavailable(provider.id, error)) {
                        console.warn("OpenRouter optional unavailable: authentication was rejected.");
                        return;
                    }
                    throw error;
                }

                expect(result.object.ok).toBe(true);
            },
            45_000,
        );
    }
});
