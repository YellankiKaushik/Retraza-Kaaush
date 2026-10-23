import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runPlanGeneration } from "@/ai/orchestrator.server";
import { openRouterResponseShape } from "@/ai/openrouter-response.server";
import { safeAiErrorKind, safeValidationIssues } from "@/ai/diagnostics.server";
import { semanticPlan } from "../helpers/semantic-plan";

const secret = "fictional-private-content-never-log";
const input = {
    rawText: secret,
    intentType: "GOAL",
    objective: {
        title: "Fictional PM plan",
        desiredOutcome: "Create a portfolio",
        successCriteria: ["Portfolio"],
    },
    facts: [],
    scenario: "BALANCED",
    correlationId: "offline",
};
beforeEach(() => {
    for (const [key, value] of Object.entries({
        AI_PROVIDER_MODE: "live",
        AI_PROVIDER_ALLOWLIST: "openrouter",
        AI_ROUTE_PRIMARY: "openrouter",
        OPENROUTER_ENABLED: "true",
        OPENROUTER_API_KEY: "fictional-private-key",
        OPENROUTER_MODEL_PRIMARY: "fictional:free",
        OPENROUTER_PROVIDER_ONLY: "",
        GROQ_ENABLED: "false",
        GEMINI_ENABLED: "false",
        AI_PROVIDER_MAX_RETRIES: "0",
    }))
        vi.stubEnv(key, value);
    vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});
function response(content: string | null, finishReason = "stop") {
    return {
        id: "offline",
        object: "chat.completion",
        created: 1,
        model: "fictional:free",
        choices: [
            {
                index: 0,
                message: { role: "assistant", content, reasoning: secret },
                finish_reason: finishReason,
            },
        ],
        usage: {
            prompt_tokens: 100,
            completion_tokens: 8000,
            total_tokens: 8100,
            completion_tokens_details: { reasoning_tokens: 7800 },
        },
    };
}
function transport(body: unknown) {
    const fetch = vi.fn(async (url: string | URL | Request) => {
        expect(new URL(String(url)).origin).toBe("https://openrouter.ai");
        return Response.json(body);
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
}
function event(label: string) {
    const call = vi.mocked(console.info).mock.calls.find((row) => row[0] === label);
    expect(call).toBeDefined();
    return JSON.parse(String(call![1]));
}
it("distinguishes HTTP success, complete JSON, validated semantic plan and compiled graph", async () => {
    const fetch = transport(response(JSON.stringify(semanticPlan())));
    const result = await runPlanGeneration(input);
    expect(result.meta.schemaValid).toBe(true);
    expect(result.meta.diagnostics).toMatchObject({ stage: "complete", graphValid: true });
    expect(event("OPENROUTER_RESPONSE_SHAPE")).toMatchObject({
        httpStatus: 200,
        responseJsonValid: true,
        contentType: "string",
        contentJsonValid: true,
        finishReason: "stop",
        reasoningTokens: 7800,
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(secret);
});
it("restricts an explicitly pinned provider without permitting fallback or paid routing", async () => {
    vi.stubEnv("OPENROUTER_PROVIDER_ONLY", "atlas-cloud/fp8");
    const fetch = transport(response(JSON.stringify(semanticPlan())));
    await runPlanGeneration(input);
    const call = fetch.mock.calls[0] as unknown as [unknown, RequestInit];
    expect(JSON.parse(String(call[1].body)).provider).toEqual({
        only: ["atlas-cloud/fp8"],
        allow_fallbacks: false,
        require_parameters: true,
        max_price: { prompt: 0, completion: 0 },
    });
    expect(fetch).toHaveBeenCalledOnce();
});
it("serializes Dots reasoning-off with strict schema and the unchanged total budget", async () => {
    vi.stubEnv("OPENROUTER_MODEL_PRIMARY", "dots-studio/dots-3-note-preview:free");
    vi.stubEnv("OPENROUTER_PROVIDER_ONLY", "atlas-cloud/fp8");
    vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "8000");
    const fetch = transport(response(JSON.stringify(semanticPlan())));
    await runPlanGeneration(input);
    const call = fetch.mock.calls[0] as unknown as [unknown, RequestInit];
    const body = JSON.parse(String(call[1].body));
    expect(body.model).toBe("dots-studio/dots-3-note-preview:free");
    expect(body.reasoning).toEqual({ enabled: false });
    expect(body.max_tokens).toBe(8000);
    expect(body.provider).toEqual({
        only: ["atlas-cloud/fp8"],
        allow_fallbacks: false,
        require_parameters: true,
        max_price: { prompt: 0, completion: 0 },
    });
    expect(body.models).toBeUndefined();
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[0].content).toContain("6-8 executable steps TOTAL");
    expect(JSON.stringify(body.response_format.json_schema.schema)).toContain("workKeys");
    expect(fetch).toHaveBeenCalledOnce();
});
it("does not impose Dots reasoning options on other configured models", async () => {
    const fetch = transport(response(JSON.stringify(semanticPlan())));
    await runPlanGeneration(input);
    const call = fetch.mock.calls[0] as unknown as [unknown, RequestInit];
    expect(JSON.parse(String(call[1].body)).reasoning).toBeUndefined();
});
it("serializes a diagnostic-only 16000 allowance without retries or a schema change", async () => {
    vi.stubEnv("OPENROUTER_MODEL_PRIMARY", "dots-studio/dots-3-note-preview:free");
    vi.stubEnv("OPENROUTER_PROVIDER_ONLY", "atlas-cloud/fp8");
    vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "16000");
    const fetch = transport(response(JSON.stringify(semanticPlan())));
    await runPlanGeneration(input);
    const call = fetch.mock.calls[0] as unknown as [unknown, RequestInit];
    const body = JSON.parse(String(call[1].body));
    expect(body.max_tokens).toBe(16000);
    expect(body.reasoning).toEqual({ enabled: false });
    expect(body.provider.only).toEqual(["atlas-cloud/fp8"]);
    expect(body.provider.allow_fallbacks).toBe(false);
    expect(body.provider.max_price).toEqual({ prompt: 0, completion: 0 });
    expect(body.models).toBeUndefined();
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
});
for (const [content, finishReason] of [
    [null, "length"],
    ["{", "length"],
    ["{", "stop"],
] as const)
    it("separates reasoning-only or truncated output from provider/API rejection", async () => {
        const fetch = transport(response(content, finishReason));
        await expect(runPlanGeneration(input)).rejects.toMatchObject({
            meta: {
                diagnostics: { stage: "output-validation", schemaValid: false, graphValid: null },
            },
        });
        expect(event("OPENROUTER_RESPONSE_SHAPE")).toMatchObject({
            httpStatus: 200,
            contentCharacters: content?.length ?? null,
            contentJsonValid: content === null ? null : false,
            finishReason,
            outputTokens: 8000,
            reasoningTokens: 7800,
        });
        expect(fetch).toHaveBeenCalledOnce();
        expect(event("AI_DIAGNOSTIC").validationFailure).toBe(
            finishReason === "length" ? "output-budget" : null,
        );
        expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(secret);
    });
it("records an HTTP200 error envelope before SDK parsing without logging its message", async () => {
    const fetch = transport({ error: { code: 429, message: secret } });
    await expect(runPlanGeneration(input)).rejects.toMatchObject({
        code: "AI_RATE_LIMITED",
        meta: {
            diagnostics: {
                stage: "provider-response",
                httpStatus: 429,
                schemaValid: null,
                graphValid: null,
            },
        },
    });
    expect(event("OPENROUTER_RESPONSE_SHAPE")).toMatchObject({
        httpStatus: 200,
        errorPresent: true,
        errorStatus: 429,
        choices: null,
        contentType: "missing-or-other",
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(secret);
});
it("distinguishes complete JSON with schema failure from semantic compiler rejection", async () => {
    const invalid = semanticPlan();
    invalid.assumptions.first.validator.workKey = secret;
    const fetch = transport(response(JSON.stringify(invalid)));
    await expect(runPlanGeneration(input)).rejects.toMatchObject({
        meta: {
            diagnostics: {
                stage: "semantic-compilation",
                schemaValid: true,
                graphValid: false,
                validationFailure: "assumption-validator",
                validationIssues: [
                    {
                        code: "custom",
                        path: ["assumptions", "first", "validator", "workKey"],
                    },
                ],
            },
        },
    });
    expect(event("OPENROUTER_RESPONSE_SHAPE").contentJsonValid).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
});
it("does not retain unknown labels, invalid counts or arbitrary upstream error names", () => {
    const shape = openRouterResponseShape(200, {
        choices: [{ message: { content: secret, reasoning: secret }, finish_reason: secret }],
        usage: { completion_tokens: Infinity, prompt_tokens: -1 },
        error: { code: secret, message: secret },
    });
    expect(shape.outputTokens).toBeNull();
    expect(shape.inputTokens).toBeNull();
    expect(shape.finishReason).toBeNull();
    expect(shape.errorStatus).toBeNull();
    expect(JSON.stringify(shape)).not.toContain(secret);
    expect(safeAiErrorKind({ name: secret })).toBeNull();
    expect(
        safeValidationIssues({
            cause: {
                issues: [
                    {
                        code: "invalid_type",
                        path: ["choices", 0, "message", "content"],
                        message: secret,
                    },
                    { code: secret, path: [secret], message: secret },
                ],
            },
        }),
    ).toEqual([
        { code: "invalid_type", path: ["choices", 0, "message", "content"] },
        { code: "unknown", path: null },
    ]);
});
it("observes array text content without changing the SDK's supported extraction", async () => {
    const body = response(null);
    const content = JSON.stringify(semanticPlan());
    Object.assign(body.choices[0]!.message, { content: [{ type: "text", text: content }] });
    const fetch = transport(body);
    await expect(runPlanGeneration(input)).resolves.toMatchObject({
        meta: { diagnostics: { stage: "complete", graphValid: true } },
    });
    expect(event("OPENROUTER_RESPONSE_SHAPE")).toMatchObject({
        contentType: "array",
        assistantTextPresent: true,
        contentCharacters: content.length,
        contentJsonValid: true,
    });
    expect(fetch).toHaveBeenCalledOnce();
});
it("recognizes syntactically complete JSON rejected by the semantic schema", async () => {
    const body = semanticPlan();
    const fetch = transport(
        response(JSON.stringify({ ...body, assumptions: { ...body.assumptions, first: null } })),
    );
    await expect(runPlanGeneration(input)).rejects.toMatchObject({
        meta: { diagnostics: { stage: "output-validation", schemaValid: false, graphValid: null } },
    });
    expect(event("OPENROUTER_RESPONSE_SHAPE").contentJsonValid).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
});
