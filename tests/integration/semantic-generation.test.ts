import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { semanticPlan } from "../helpers/semantic-plan";
import { compileSemanticPlan } from "@/ai/semantic-plan.server";

const state = vi.hoisted(() => ({ release: vi.fn(), audit: vi.fn(), complete: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
    createServerFn: () => {
        const builder = {
            middleware: () => builder,
            inputValidator: () => builder,
            handler: (...handlers: unknown[]) => handlers.at(-1),
        };
        return builder;
    },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/telemetry.server", () => ({
    claimIdempotencyKey: async () => ({ replay: null }),
    assertWithinQuota: vi.fn(),
    configuredDailyAiLimit: () => 10,
    recordAiUsage: vi.fn(),
    completeIdempotencyKey: state.complete,
    releaseIdempotencyKey: state.release,
    recordAudit: state.audit,
}));
import { generatePlan, replan } from "@/lib/planning.functions";
function strictObjects(value: unknown) {
    if (!value || typeof value !== "object") return;
    const object = value as Record<string, unknown>;
    if (object.type === "object") {
        expect(object.additionalProperties).toBe(false);
        expect([...(object.required as string[])].sort()).toEqual(
            Object.keys(object.properties as object).sort(),
        );
    }
    for (const child of Object.values(object)) strictObjects(child);
}
function minimalKeywords(value: unknown) {
    if (!value || typeof value !== "object") return;
    const object = value as Record<string, unknown>;
    if (Array.isArray(object["anyOf"]))
        for (const branch of object["anyOf"]) {
            expect(branch).not.toHaveProperty("anyOf");
            expect(branch).toHaveProperty("type");
        }
    for (const key of [
        "minItems",
        "maxItems",
        "minLength",
        "maxLength",
        "minimum",
        "maximum",
        "pattern",
        "format",
        "const",
    ])
        expect(object).not.toHaveProperty(key);
    for (const child of Object.values(object)) minimalKeywords(child);
}
beforeEach(() => {
    vi.clearAllMocks();
    for (const [k, v] of Object.entries({
        AI_PROVIDER_MODE: "live",
        AI_PROVIDER_ALLOWLIST: "groq",
        AI_ROUTE_PRIMARY: "groq",
        GROQ_ENABLED: "true",
        GROQ_API_KEY: "fictional-groq-private-key",
        GROQ_MODEL_PRIMARY: "openai/gpt-oss-20b",
        GROQ_MODEL_DEFAULT: "openai/gpt-oss-20b",
        GROQ_BASE_URL: "https://api.groq.com/openai/v1",
        AI_PROVIDER_MAX_RETRIES: "0",
    }))
        vi.stubEnv(k, v);
    vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});
function sdk(response: unknown, status = 200, errorCode?: string) {
    const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const openrouter = process.env["AI_PROVIDER_ALLOWLIST"] === "openrouter";
        expect(new URL(String(url)).hostname).toBe(openrouter ? "openrouter.ai" : "api.groq.com");
        const body = JSON.parse(String(init?.body));
        expect(body.response_format.type).toBe("json_schema");
        expect(body.response_format.json_schema.strict).toBe(true);
        strictObjects(body.response_format.json_schema.schema);
        const planning = !!body.response_format.json_schema.schema.properties.strategies;
        if (planning) {
            minimalKeywords(body.response_format.json_schema.schema);
            expect(body.model).toBe(openrouter ? "metadata-verified:free" : "openai/gpt-oss-20b");
            if (openrouter) {
                expect(new Headers(init?.headers).get("Authorization")).toBe(
                    "Bearer fictional-owner-openrouter-key",
                );
                expect(body.provider).toEqual({
                    allow_fallbacks: false,
                    require_parameters: true,
                    max_price: { prompt: 0, completion: 0 },
                });
            }
            expect(body.stream).not.toBe(true);
            for (const key of [
                "logprobs",
                "logit_bias",
                "top_logprobs",
                "tools",
                "tool_choice",
                "reasoning_format",
            ])
                expect(body).not.toHaveProperty(key);
            expect(body.messages[0].content).toContain("semantic planner");
            const root = body.response_format.json_schema.schema;
            const resolve = (value: typeof root) =>
                value.$ref
                    ? value.$ref
                          .slice(2)
                          .split("/")
                          .reduce(
                              (node: typeof root, part: string) =>
                                  node[part.replace(/~1/g, "/").replace(/~0/g, "~")],
                              root,
                          )
                    : value;
            const nullable = (value: typeof root) => {
                const v = resolve(value);
                return (
                    v.type === "null" ||
                    (Array.isArray(v.type) && v.type.includes("null")) ||
                    (v.anyOf ?? []).some((part: typeof root) => resolve(part).type === "null")
                );
            };
            const slots = resolve(root.properties.assumptions);
            expect(slots.type).toBe("object");
            expect(slots.additionalProperties).toBe(false);
            expect([...slots.required].sort()).toEqual([
                "fifth",
                "first",
                "fourth",
                "second",
                "third",
            ]);
            expect(Object.keys(slots.properties).sort()).toEqual([...slots.required].sort());
            for (const name of ["first", "second", "third"])
                expect(nullable(slots.properties[name])).toBe(false);
            for (const name of ["fourth", "fifth"])
                expect(nullable(slots.properties[name])).toBe(true);
            const variants = resolve(slots.properties.first).anyOf.map(resolve);
            const high = variants.find(
                (v: typeof root) =>
                    v.properties.importance.const === "HIGH" ||
                    v.properties.importance.enum?.includes("HIGH"),
            );
            expect(high).toBeDefined();
            expect(nullable(high.properties.validator)).toBe(false);
            expect(root.properties.unvalidatedAssumptions).toBeUndefined();
            const step = resolve(
                resolve(root.properties.strategies.items).properties.milestones.items,
            ).properties.work.items;
            expect(resolve(step).properties.assumptions).toBeUndefined();
        }
        return new Response(
            JSON.stringify(
                status === 200
                    ? {
                          id: "offline",
                          object: "chat.completion",
                          created: 1,
                          model: body.model,
                          choices: [
                              {
                                  index: 0,
                                  message: {
                                      role: "assistant",
                                      content: JSON.stringify(
                                          planning
                                              ? response
                                              : { headline: "Reviewed changes", changes: [] },
                                      ),
                                  },
                                  finish_reason: "stop",
                              },
                          ],
                          usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
                      }
                    : {
                          error: {
                              message: "Synthetic private provider detail, never log this message",
                              type:
                                  status === 400 ? "invalid_request_error" : "rate_limit_exceeded",
                              code: errorCode,
                          },
                      },
            ),
            { status, headers: { "Content-Type": "application/json" } },
        );
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
}
function handler(rpcError = false) {
    const rpc = vi.fn(async (_name: string, _args: { payload: { assumptions: unknown[] } }) =>
        rpcError
            ? { data: null, error: { message: "Synthetic transaction rolled back" } }
            : { data: { versionId: "saved", versionNumber: 1 }, error: null },
    );
    const from = (table: string) => {
        const result = () => ({
            error: null,
            data:
                table === "intake_cases"
                    ? {
                          id: "case",
                          status: "READY_FOR_PLANNING",
                          raw_text: "Build a PM portfolio",
                          success_criteria: [],
                      }
                    : table === "plans"
                      ? { id: "plan", active_version_id: null }
                      : [],
        });
        const builder = {
            select: () => builder,
            eq: () => builder,
            insert: () => builder,
            order: () => builder,
            limit: () => builder,
            maybeSingle: async () => result(),
            single: async () => result(),
            then: (resolve: (r: unknown) => unknown) => Promise.resolve(result()).then(resolve),
        };
        return builder;
    };
    const invoke = () =>
        (generatePlan as unknown as (args: unknown) => Promise<unknown>)({
            data: {
                caseId: "case",
                scenario: "BALANCED",
                strategyPreference: null,
                idempotencyKey: "offline-request",
            },
            context: { userId: "owner", supabase: { from, rpc } },
        });
    return { invoke, rpc };
}
it("actual source handler parses strict Groq semantic JSON, compiles and atomically persists a complete graph", async () => {
    const fetch = sdk(semanticPlan());
    const { invoke, rpc } = handler();
    await expect(invoke()).resolves.toMatchObject({ planId: "plan", versionId: "saved" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith(
        "persist_plan_graph",
        expect.objectContaining({ activate: true }),
    );
    expect(state.complete).toHaveBeenCalledOnce();
    expect(state.release).not.toHaveBeenCalled();
});

for (const valid of [true, false])
    it("owner-authorized OpenRouter uses actual semantic SDK contract and persists only valid output", async () => {
        for (const [key, value] of Object.entries({
            AI_PROVIDER_ALLOWLIST: "openrouter",
            AI_ROUTE_PRIMARY: "openrouter",
            OPENROUTER_ENABLED: "true",
            OPENROUTER_API_KEY: "fictional-owner-openrouter-key",
            OPENROUTER_MODEL_PRIMARY: "metadata-verified:free",
            GROQ_ENABLED: "false",
            GEMINI_ENABLED: "false",
        }))
            vi.stubEnv(key, value);
        const s = semanticPlan();
        if (!valid) s.strategies[1]!.milestones = [];
        const fetch = sdk(s);
        const { invoke, rpc } = handler();
        if (valid) {
            await expect(invoke()).resolves.toMatchObject({ versionId: "saved" });
            expect(rpc).toHaveBeenCalledOnce();
        } else {
            await expect(invoke()).rejects.toThrow();
            expect(rpc).not.toHaveBeenCalled();
            expect(state.complete).not.toHaveBeenCalled();
        }
        expect(fetch).toHaveBeenCalledOnce();
    });
it("does not call persistence or report success for a missing semantic branch", async () => {
    const s = semanticPlan();
    s.strategies[1]!.milestones = [];
    const fetch = sdk(s);
    const { invoke, rpc } = handler();
    await expect(invoke()).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
    expect(state.complete).not.toHaveBeenCalled();
    expect(state.release).toHaveBeenCalledOnce();
});
it("rejects nonexistent dependencies before the actual handler's persistence boundary", async () => {
    const s = semanticPlan();
    s.strategies[0]!.milestones[0]!.work[0]!.dependency = { kind: "AFTER", workKeys: ["absent"] };
    const fetch = sdk(s);
    const { invoke, rpc } = handler();
    await expect(invoke()).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
    expect(state.complete).not.toHaveBeenCalled();
});
it("handles Groq rate limiting without retry, mock success or persistence", async () => {
    const fetch = sdk(null, 429);
    const { invoke, rpc } = handler();
    await expect(invoke()).rejects.toThrow(/rate limit/i);
    expect(fetch).toHaveBeenCalledOnce();
    expect(rpc).not.toHaveBeenCalled();
    expect(state.complete).not.toHaveBeenCalled();
});
it("does not report success after atomic persistence fails", async () => {
    sdk(semanticPlan());
    const { invoke, rpc } = handler(true);
    await expect(invoke()).rejects.toThrow(/rolled back/i);
    expect(rpc).toHaveBeenCalledOnce();
    expect(state.complete).not.toHaveBeenCalled();
    expect(state.release).toHaveBeenCalledOnce();
});

for (const errorCode of ["invalid_json_schema", "synthetic-private-code"])
    it("reports HTTP400 request rejection without fabricated output, persistence or retry", async () => {
        const fetch = sdk(null, 400, errorCode);
        const { invoke, rpc } = handler();
        await expect(invoke()).rejects.toThrow("provider rejected the planning request");
        const diagnostic = vi
            .mocked(console.info)
            .mock.calls.find((call) => call[0] === "AI_DIAGNOSTIC");
        expect(diagnostic).toBeDefined();
        expect(JSON.parse(String(diagnostic![1]))).toMatchObject({
            httpStatus: 400,
            providerErrorCode:
                errorCode === "invalid_json_schema" ? errorCode : "invalid_request_error",
            schemaValid: null,
            graphValid: null,
            finishReason: null,
            outputTokens: null,
        });
        expect(fetch).toHaveBeenCalledOnce();
        expect(rpc).not.toHaveBeenCalled();
        expect(state.complete).not.toHaveBeenCalled();
        expect(state.release).toHaveBeenCalledOnce();
        const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
        expect(logs).not.toContain("Synthetic private provider detail");
        expect(logs).not.toContain("synthetic-private-code");
    });

for (const count of [2, 3, 4, 5, 6])
    it(
        "actual handler enforces " + count + " assumptions from SDK response before persistence",
        async () => {
            const s = semanticPlan();
            const slots: Record<string, unknown> = { ...s.assumptions };
            if (count === 2) delete slots.third;
            if (count >= 4)
                slots.fourth = {
                    ...s.assumptions.second,
                    statement: "External reviewers can provide actionable portfolio feedback.",
                };
            if (count >= 5)
                slots.fifth = {
                    ...s.assumptions.third,
                    statement: "Internal shadowing can fit the proposed schedule.",
                };
            if (count === 6)
                slots.sixth = {
                    ...s.assumptions.third,
                    statement: "Sixth must be rejected, never truncated.",
                };
            const fetch = sdk({ ...s, assumptions: slots });
            const { invoke, rpc } = handler();
            if (count >= 3 && count <= 5) {
                await expect(invoke()).resolves.toMatchObject({ versionId: "saved" });
                expect(rpc).toHaveBeenCalledWith(
                    "persist_plan_graph",
                    expect.objectContaining({
                        payload: expect.objectContaining({ assumptions: expect.any(Array) }),
                    }),
                );
                expect(rpc.mock.calls[0]![1].payload.assumptions).toHaveLength(count);
            } else {
                await expect(invoke()).rejects.toThrow();
                expect(rpc).not.toHaveBeenCalled();
                expect(state.complete).not.toHaveBeenCalled();
            }
            expect(fetch).toHaveBeenCalledOnce();
        },
    );

for (const validator of [null, { workKey: "absent" }])
    it("actual handler rejects a missing or invalid HIGH validator without retry or persistence", async () => {
        const s = semanticPlan();
        const fetch = sdk({
            ...s,
            assumptions: { ...s.assumptions, first: { ...s.assumptions.first, validator } },
        });
        const { invoke, rpc } = handler();
        await expect(invoke()).rejects.toThrow();
        expect(fetch).toHaveBeenCalledOnce();
        expect(rpc).not.toHaveBeenCalled();
    });

it("actual replan handler compiles a candidate without overwriting accepted completion or activation", async () => {
    const semantic = semanticPlan();
    const graph = compileSemanticPlan(semantic);
    const first = graph.nodes.find((n) => n.nodeType === "ACTION")!;
    const strategyIds = new Map(graph.strategies.map((s) => [s.key, crypto.randomUUID()]));
    const nodeIds = new Map(graph.nodes.map((n) => [n.tempId, crypto.randomUUID()]));
    const savedNodes = graph.nodes.map((n) => ({
        id: nodeIds.get(n.tempId),
        user_id: "owner",
        plan_version_id: "active",
        node_type: n.nodeType,
        title: n.title,
        description: n.description,
        status: n.tempId === first.tempId ? "DONE" : "PENDING",
        strategy_id: n.strategyKey ? strategyIds.get(n.strategyKey) : null,
        metadata: {
            tempId: n.tempId,
            strategyKey: n.strategyKey,
            expectedResult: n.expectedResult,
        },
    }));
    const actions = graph.nodes
        .filter((n) => ["ACTION", "EXPERIMENT"].includes(n.nodeType))
        .map((n) => ({
            plan_node_id: nodeIds.get(n.tempId),
            user_id: "owner",
            completion_criteria: n.completionCriteria,
            expected_result: n.expectedResult,
            completed_at: n.tempId === first.tempId ? "2026-10-22T10:00:00Z" : null,
            result: n.tempId === first.tempId ? { note: "Verified work" } : null,
        }));
    semantic.strategies[0]!.milestones[0]!.work[0]!.content = {
        source: "accepted",
        tempId: first.tempId,
    };
    const fetch = sdk(semantic);
    let candidate: Record<string, unknown> = {};
    const original = structuredClone(savedNodes);
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
        expect(name).toBe("persist_plan_graph");
        expect(args.activate).toBe(false);
        candidate = args.payload as Record<string, unknown>;
        return { data: { versionId: "candidate", versionNumber: 2 }, error: null };
    });
    const from = (table: string) => {
        const filters: Record<string, unknown> = {};
        const rows = () => {
            const after = filters.plan_version_id === "candidate";
            const tables: Record<string, unknown> = {
                plans: { id: "plan", case_id: "case", active_version_id: "active" },
                intake_cases: { raw_text: "Build PM portfolio", success_criteria: [] },
                plan_versions: {
                    id: "active",
                    plan_id: "plan",
                    user_id: "owner",
                    state: "ACTIVE",
                    parent_version_id: null,
                    scenario: "BALANCED",
                },
                plan_nodes: after ? candidate.plan_nodes : savedNodes,
                plan_edges: after
                    ? candidate.plan_edges
                    : graph.edges.map((e) => ({
                          user_id: "owner",
                          plan_version_id: "active",
                          from_node_id: nodeIds.get(e.from),
                          to_node_id: nodeIds.get(e.to),
                          edge_type: e.edgeType,
                          hard_dependency: e.hardDependency,
                          rationale: e.rationale,
                      })),
                strategies: graph.strategies.map((s) => ({
                    id: strategyIds.get(s.key),
                    user_id: "owner",
                    plan_version_id: "active",
                    name: s.name,
                    summary: s.summary,
                    selected: s.recommended,
                })),
                actions,
            };
            return { data: tables[table] ?? [], error: null };
        };
        const builder = {
            select: () => builder,
            eq: (key: string, v: unknown) => {
                filters[key] = v;
                return builder;
            },
            insert: () => builder,
            order: () => builder,
            limit: () => builder,
            single: async () => rows(),
            maybeSingle: async () => rows(),
            then: (resolve: (r: unknown) => unknown) => Promise.resolve(rows()).then(resolve),
        };
        return builder;
    };
    await expect(
        (replan as unknown as (a: unknown) => Promise<unknown>)({
            data: {
                planId: "plan",
                reason: "NEW_INFORMATION",
                note: "Review capacity",
                changedFacts: [],
                idempotencyKey: "offline-replan",
            },
            context: { userId: "owner", supabase: { from, rpc } },
        }),
    ).resolves.toMatchObject({ versionId: "candidate", requiresAcceptance: true });
    const candidateNodes = candidate.plan_nodes as typeof savedNodes;
    const completed = candidateNodes.find((n) => n.metadata.tempId === first.tempId)!;
    expect(completed.status).toBe("DONE");
    expect(
        (candidate.actions as typeof actions).find((a) => a.plan_node_id === completed.id),
    ).toMatchObject({
        completed_at: "2026-10-22T10:00:00Z",
        result: { note: "Verified work" },
    });
    expect(savedNodes).toEqual(original);
    expect(rpc).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(2); // One replan and one explanation, no repair inference.
});
