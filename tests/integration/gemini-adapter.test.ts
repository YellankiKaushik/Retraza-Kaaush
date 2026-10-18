import { generateObject } from "ai";
import { z } from "zod";
import { afterEach, expect, it, vi } from "vitest";
import { candidatesForAlias } from "@/lib/ai-gateway.server";
import { geminiResponse } from "../helpers/gemini-response";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});
it("sends authenticated schema generation only to the direct Gemini API without paid tools", async () => {
    vi.stubEnv("AI_PROVIDER_MODE", "live");
    vi.stubEnv("AI_PROVIDER_ALLOWLIST", "gemini");
    vi.stubEnv("GEMINI_ENABLED", "true");
    vi.stubEnv("GEMINI_MODEL_FAST", "gemini-3.8-flash");
    vi.stubEnv("GEMINI_API_KEY", "fictional-private-key");
    vi.stubEnv("GEMINI_MODEL_DEFAULT", "gemini-3.8-flash");
    const fetch = vi.fn(async () => geminiResponse('{"ok":true}'));
    vi.stubGlobal("fetch", fetch);
    const candidate = candidatesForAlias("FAST").find(
        (candidate) => candidate.providerId === "gemini",
    )!;
    expect(candidate.providerId).toBe("gemini");
    const result = await generateObject({
        model: candidate.model,
        schema: z.object({ ok: z.literal(true) }),
        prompt: "Fictional integration test",
        providerOptions: {
            google: {
                structuredOutputs: true,
                thinkingConfig: { thinkingLevel: "low", includeThoughts: false },
            },
        },
        maxRetries: 0,
        maxOutputTokens: 12000,
    });
    expect(result.object).toEqual({ ok: true });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toBe(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
    );
    expect(new URL(url).searchParams.has("key")).toBe(false);
    expect(new Headers(init.headers).get("x-goog-api-key")).toBe("fictional-private-key");
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema).toBeDefined();
    expect(body.generationConfig.thinkingConfig).toEqual({
        thinkingLevel: "low",
        includeThoughts: false,
    });
    expect(body.tools).toBeUndefined();
    expect(body.cachedContent).toBeUndefined();
    expect(body.generationConfig.serviceTier).toBeUndefined();
    expect(body.provider).toBeUndefined();
});
