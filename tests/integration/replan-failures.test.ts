import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    release: vi.fn(),
    complete: vi.fn(),
    generate: vi.fn(),
    persist: vi.fn(),
    failures: {} as Record<string, string>,
    reads: {} as Record<string, number>,
}));
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
    claimIdempotencyKey: vi.fn(async () => ({ replay: null })),
    assertWithinQuota: vi.fn(),
    configuredDailyAiLimit: () => 10,
    recordAiUsage: vi.fn(),
    recordAudit: vi.fn(),
    releaseIdempotencyKey: mocks.release,
    completeIdempotencyKey: mocks.complete,
}));
vi.mock("@/ai/orchestrator.server", () => ({
    runReplan: mocks.generate,
    runChangeExplanation: vi.fn(async () => ({ data: { changes: [] }, meta: {} })),
}));
vi.mock("@/lib/planner.server", async (original) => ({
    ...(await original<typeof import("@/lib/planner.server")>()),
    persistProposal: mocks.persist,
    nextVersionNumber: vi.fn(async () => 2),
    snapshotText: () => "snapshot",
    diffPlanNodes: () => [{ change_type: "MODIFIED" }],
}));
import { replan } from "@/lib/planning.functions";

beforeEach(() => {
    vi.clearAllMocks();
    mocks.failures = {};
    mocks.reads = {};
    mocks.generate.mockResolvedValue({ data: { summary: "Revised" }, meta: {} });
    mocks.persist.mockResolvedValue({ versionId: "candidate", versionNumber: 2 });
});
function query(table: string) {
    let write = false;
    const result = () => {
        mocks.reads[table] = (mocks.reads[table] || 0) + 1;
        const failure = mocks.failures[table];
        const error =
            failure === "always" ||
            (failure === "write" && write) ||
            (failure === "after-save" && mocks.persist.mock.calls.length > 0)
                ? { message: "Synthetic database failure" }
                : null;
        const data =
            table === "plans"
                ? { id: "plan", case_id: "case", active_version_id: "active" }
                : table === "intake_cases"
                  ? { raw_text: "Goal", success_criteria: [] }
                  : table === "plan_versions"
                    ? { summary: "Old", scenario: "BALANCED" }
                    : [];
        return { data, error };
    };
    const builder = {
        select: () => builder,
        eq: () => builder,
        insert: () => {
            write = true;
            return builder;
        },
        single: async () => result(),
        maybeSingle: async () => result(),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return builder;
}
async function invoke(changedFacts: unknown[] = []) {
    const handler = replan as unknown as (input: unknown) => Promise<unknown>;
    return handler({
        data: {
            planId: "plan",
            reason: "USER_REQUEST",
            note: "",
            idempotencyKey: "request-key",
            changedFacts,
        },
        context: { userId: "owner", supabase: { from: query } },
    });
}
it("does not generate from missing or failed source reads", async () => {
    mocks.failures["plan_versions"] = "always";
    await expect(invoke()).rejects.toThrow(/load|read|database/i);
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledOnce();
});
it("surfaces changed-fact persistence failure before generating", async () => {
    mocks.failures["case_context_facts"] = "write";
    await expect(
        invoke([{ category: "RESOURCE", key: "capacity", value: "3 hours" }]),
    ).rejects.toThrow(/context|fact|database/i);
    expect(mocks.generate).not.toHaveBeenCalled();
});
it("keeps the request reserved if a candidate committed before review reads failed", async () => {
    mocks.failures["plan_nodes"] = "after-save";
    await expect(invoke()).rejects.toThrow(/saved.*refresh|refresh.*saved/i);
    expect(mocks.persist).toHaveBeenCalledOnce();
    expect(mocks.release).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
});
it("does not report success or release the claim when the change diff cannot be saved", async () => {
    mocks.failures["plan_changes"] = "write";
    await expect(invoke()).rejects.toThrow(/saved.*refresh|refresh.*saved/i);
    expect(mocks.release).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
});
it("returns the transaction-allocated version number after concurrent allocation", async () => {
    mocks.persist.mockResolvedValue({ versionId: "candidate", versionNumber: 3 });
    await expect(invoke()).resolves.toMatchObject({ versionNumber: 3 });
});
