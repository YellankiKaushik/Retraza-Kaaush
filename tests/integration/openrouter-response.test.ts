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
    invalid.assumptions.first.validator.workIndex = 99;
    const fetch = transport(response(JSON.stringify(invalid)));
    await expect(runPlanGeneration(input)).rejects.toMatchObject({
        meta: {
            diagnostics: {
                stage: "semantic-compilation",
                schemaValid: true,
                graphValid: false,
                validationFailure: "assumption-validator",
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
