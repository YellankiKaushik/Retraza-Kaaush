import { afterEach, describe, expect, it, vi } from "vitest";
import { planningPrompt, replanPrompt, COMPACT_PLANNING_PROFILE } from "@/ai/prompts.server";
import { runPlanGeneration, runReplan } from "@/ai/orchestrator.server";
import { mockPlanProposal } from "@/ai/mock-provider.server";
import { logAiDiagnostics } from "@/ai/diagnostics.server";
import { geminiResponse } from "../helpers/gemini-response";

const secretMarker = "fictional-confidential-input-do-not-log";
const input = {
    rawText: secretMarker,
    intentType: "PROJECT",
    objective: {
        title: "Fictional portfolio",
        desiredOutcome: "Publish one study",
        successCriteria: ["One study published"],
    },
    facts: [],
    scenario: "BALANCED",
    correlationId: "fictional-test",
};
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});
function configure() {
    vi.stubEnv("AI_PROVIDER_MODE", "live");
    vi.stubEnv("AI_PROVIDER_ALLOWLIST", "gemini");
    vi.stubEnv("GEMINI_ENABLED", "true");
    vi.stubEnv("GEMINI_MODEL_PRIMARY", "gemini-3.8-flash");
    vi.stubEnv("GEMINI_API_KEY", "fictional-private-key");
    vi.stubEnv("GEMINI_MODEL_DEFAULT", "gemini-3.8-flash");
    vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "0");
    vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "12000");
    return vi.spyOn(console, "info").mockImplementation(() => {});
}
function respond(content: string, finishReason = "stop", tokens = 200, model = "gemini-3.8-flash") {
    const fetch = vi.fn(async (_url, init) => {
        const body = JSON.parse(init.body);
        expect(body.generationConfig.maxOutputTokens).toBe(12000);
        expect(body.generationConfig.thinkingConfig).toEqual({
            thinkingLevel: "low",
            includeThoughts: false,
        });
        expect(body.generationConfig.responseMimeType).toBe("application/json");
        expect(body.tools).toBeUndefined();
        return geminiResponse(
            content,
            finishReason === "length" ? "MAX_TOKENS" : "STOP",
            tokens,
            model,
        );
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
}
describe("compact planning and safe diagnostics", () => {
    it("applies the same compact graph profile to generation and replanning", () => {
        for (const prompt of [
            planningPrompt(input),
            replanPrompt({ ...input, previous: "fictional", reason: "USER_REQUEST", note: "" }),
        ]) {
            expect(prompt.system).toContain(COMPACT_PLANNING_PROFILE);
            for (const constraint of [
                "exactly 2",
                "3-5 milestones",
                "6-12 ACTION/EXPERIMENT",
                "24",
                "48 edges",
                "3-5 assumptions",
                "3-5 risks",
                "acyclic",
                "explicit BLOCKER",
                "no chain-of-thought",
            ])
                expect(prompt.system).toContain(constraint);
            expect(prompt.system).not.toContain("2-3 MATERIALLY");
        }
    });
    it("records schema and graph PASS through the actual SDK for planning and replanning", async () => {
        const logs = configure();
        respond(JSON.stringify(mockPlanProposal(input)));
        for (const result of [
            await runPlanGeneration(input),
            await runReplan({ ...input, previous: "fictional", reason: "USER_REQUEST", note: "" }),
        ])
            expect(result.meta.diagnostics).toMatchObject({
                outputTokens: 200,
                finishReason: "stop",
                schemaValid: true,
                graphValid: true,
                timedOut: false,
            });
        expect(JSON.stringify(logs.mock.calls)).not.toContain(secretMarker);
        expect(JSON.stringify(logs.mock.calls)).not.toContain("fictional-private-key");
    });
    for (const [finishReason, content, tokens] of [
        ["length", '{"unfinished":', 12000],
        ["stop", '{"missingRequiredFields":true}', 200],
    ] as const) {
        it(`retains ${finishReason} finish and token counts on schema rejection`, async () => {
            const logs = configure();
            vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "2");
            const fetch = respond(content, finishReason, tokens);
            await expect(runPlanGeneration(input)).rejects.toMatchObject({
                code: "AI_SCHEMA_INVALID",
                meta: {
                    outputTokens: tokens,
                    schemaValid: false,
                    diagnostics: { finishReason, graphValid: null, timedOut: false },
                },
            });
            expect(JSON.stringify(logs.mock.calls)).not.toContain(content);
            expect(fetch).toHaveBeenCalledTimes(1);
        });
    }
    it("distinguishes graph rejection from schema failure without repairing the graph", async () => {
        configure();
        vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "2");
        const proposal = mockPlanProposal(input);
        proposal.edges.push({
            from: proposal.nodes[0]!.tempId,
            to: proposal.nodes[0]!.tempId,
            edgeType: "REQUIRES",
            hardDependency: true,
            rationale: null,
        });
        const fetch = respond(JSON.stringify(proposal));
        await expect(runPlanGeneration(input)).rejects.toMatchObject({
            code: "AI_GRAPH_INVALID",
            meta: { schemaValid: true, diagnostics: { graphValid: false, finishReason: "stop" } },
        });
        expect(fetch).toHaveBeenCalledTimes(1);
    });
    it("records actual timeouts without dumping error contents", async () => {
        const logs = configure();
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new DOMException(secretMarker + " timed out", "TimeoutError");
            }),
        );
        await expect(runPlanGeneration(input)).rejects.toMatchObject({
            meta: {
                diagnostics: {
                    timedOut: true,
                    schemaValid: null,
                    graphValid: null,
                    finishReason: null,
                },
            },
        });
        expect(JSON.stringify(logs.mock.calls)).not.toContain(secretMarker);
    });
    it("omits unrecognized finish reasons and provider strings from diagnostics", () => {
        const logs = vi.spyOn(console, "info").mockImplementation(() => {});
        logAiDiagnostics(secretMarker, {
            providerModel: secretMarker,
            outputTokens: Infinity,
            finishReason: secretMarker,
            schemaValid: null,
            graphValid: null,
            timedOut: false,
        });
        expect(JSON.stringify(logs.mock.calls)).not.toContain(secretMarker);
    });
    it("classifies a Gemini 504 as a timeout, not a schema failure", async () => {
        configure();
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(
                        JSON.stringify({
                            error: {
                                code: 504,
                                message: secretMarker,
                                status: "DEADLINE_EXCEEDED",
                            },
                        }),
                        {
                            status: 504,
                            headers: { "Content-Type": "application/json" },
                        },
                    ),
            ),
        );
        await expect(runPlanGeneration(input)).rejects.toMatchObject({
            code: "AI_PROVIDER_TIMEOUT",
            meta: { diagnostics: { timedOut: true, schemaValid: null, graphValid: null } },
        });
    });
    it("records the configured Gemini model when the adapter does not expose a served version", async () => {
        configure();
        respond(JSON.stringify(mockPlanProposal(input)), "stop", 200, "gemini-3.8-flash-001");
        const result = await runPlanGeneration(input);
        expect(result.meta.providerModel).toBe("gemini-3.8-flash");
        expect(result.meta.diagnostics?.providerModel).toBe("gemini-3.8-flash");
    });
});
