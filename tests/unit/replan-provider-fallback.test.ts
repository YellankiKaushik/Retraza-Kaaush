import { afterEach, describe, expect, it, vi } from "vitest";
import { runReplan } from "@/ai/orchestrator.server";
import { compactPlan } from "../helpers/compact-plan";
import { replanContext } from "../helpers/replan-context";
import { geminiResponse } from "../helpers/gemini-response";
import { semanticPlan } from "../helpers/semantic-plan";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function setup(groqStatus = 200, geminiUnavailable = false) {
    for (const [key, value] of Object.entries({
        AI_PROVIDER_MODE: "live",
        AI_PROVIDER_ALLOWLIST: "gemini,groq",
        AI_ROUTE_PRIMARY: "gemini,groq,openrouter,openai",
        GEMINI_ENABLED: "true",
        GEMINI_API_KEY: "fictional-gemini-key",
        GEMINI_MODEL_PRIMARY: "gemini-3.8-flash",
        GROQ_ENABLED: "true",
        GROQ_API_KEY: "fictional-groq-key",
        GROQ_MODEL_PRIMARY: "fictional-groq-model",
        OPENROUTER_ENABLED: "true",
        OPENROUTER_API_KEY: "fictional-blocked-third-key",
        OPENROUTER_MODEL_PRIMARY: "fictional-third-model",
        AI_PROVIDER_MAX_RETRIES: "0",
    }))
        vi.stubEnv(key, value);
    const logs = vi.spyOn(console, "info").mockImplementation(() => {});
    const proposal = compactPlan();
    const accepted = replanContext(proposal);
    const invalid = structuredClone(proposal);
    invalid.nodes.find((n) => n.tempId === "action-baseline")!.title = "Redo accepted work";
    const calls: string[] = [];
    const fetch = vi.fn(async (url: string | URL | Request) => {
        const host = new URL(String(url)).hostname;
        calls.push(host);
        if (host === "generativelanguage.googleapis.com")
            return geminiUnavailable
                ? new Response('{"error":{"message":"fictional-private-payload"}}', {
                      status: 503,
                      headers: { "Content-Type": "application/json" },
                  })
                : geminiResponse(JSON.stringify(invalid));
        if (host === "api.groq.com")
            return groqStatus !== 200
                ? new Response(
                      '{"error":{"message":"fictional-private-payload","type":"rate_limit_exceeded"}}',
                      {
                          status: groqStatus,
                          headers: { "Content-Type": "application/json", "retry-after": "60" },
                      },
                  )
                : new Response(
                      JSON.stringify({
                          id: "offline",
                          object: "chat.completion",
                          created: 1,
                          model: "fictional-groq-model",
                          choices: [
                              {
                                  index: 0,
                                  message: {
                                      role: "assistant",
                                      content: JSON.stringify(semanticPlan()),
                                  },
                                  finish_reason: "stop",
                              },
                          ],
                          usage: { prompt_tokens: 80, completion_tokens: 200, total_tokens: 280 },
                      }),
                      { headers: { "Content-Type": "application/json" } },
                  );
        throw new Error("Forbidden third provider: " + host);
    });
    vi.stubGlobal("fetch", fetch);
    const input = {
        rawText: "fictional-confidential-goal",
        intentType: "GOAL",
        objective: {
            title: "PM",
            desiredOutcome: "One portfolio",
            successCriteria: ["Portfolio published"],
        },
        facts: [],
        scenario: "BALANCED",
        previous: "legacy snapshot",
        continuity: accepted,
        reason: "NEW_INFORMATION",
        note: "Less capacity",
        correlationId: "offline",
    };
    return { input, accepted, calls, logs, fetch };
}

describe("bounded SDK replanning fallback, no network", () => {
    it("rejects Gemini graph then accepts actual Groq SDK structured parsing without retries or a third provider", async () => {
        const { input, accepted, calls, logs } = setup();
        const before = structuredClone(accepted);
        const result = await runReplan(input);
        expect(result.meta.provider).toBe("groq");
        expect(
            result.meta.attempts.map((attempt) => [
                attempt.provider,
                attempt.outcome,
                attempt.attempt,
            ]),
        ).toEqual([
            ["gemini", "AI_GRAPH_INVALID", 0],
            ["groq", "SUCCESS", 0],
        ]);
        expect(calls).toEqual(["generativelanguage.googleapis.com", "api.groq.com"]);
        expect(JSON.stringify(logs.mock.calls)).toContain("progress-preservation");
        expect(JSON.stringify(logs.mock.calls)).not.toContain("fictional-confidential-goal");
        expect(accepted).toEqual(before);
    });
    it("reports Gemini graph rejection plus Groq rate limiting without hidden retry/mock/third-provider fallback", async () => {
        const { input, calls, logs } = setup(429);
        await expect(runReplan(input)).rejects.toMatchObject({
            code: "AI_RATE_LIMITED",
            message: expect.stringMatching(/rate limited.*unchanged/i),
            meta: {
                outcome: "AI_RATE_LIMITED",
                diagnostics: { httpStatus: 429, retryAfterSeconds: 60 },
                attempts: [
                    expect.objectContaining({
                        provider: "gemini",
                        outcome: "AI_GRAPH_INVALID",
                        attempt: 0,
                    }),
                    expect.objectContaining({
                        provider: "groq",
                        outcome: "AI_RATE_LIMITED",
                        attempt: 0,
                    }),
                ],
            },
        });
        expect(calls).toHaveLength(2);
        expect(JSON.stringify(logs.mock.calls)).not.toContain("fictional-private-payload");
    });
    it("fails recoverably with exactly two attempts when both providers are unavailable", async () => {
        const { input, calls } = setup(503, true);
        await expect(runReplan(input)).rejects.toMatchObject({
            code: "AI_PROVIDER_TIMEOUT",
            message: expect.stringMatching(/Saved plans still work/),
            meta: {
                attempts: [
                    expect.objectContaining({ attempt: 0 }),
                    expect.objectContaining({ attempt: 0 }),
                ],
            },
        });
        expect(calls).toHaveLength(2);
    });
});
