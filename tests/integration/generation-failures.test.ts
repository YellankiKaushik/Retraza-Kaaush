import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    generate: vi.fn(),
    persist: vi.fn(),
    release: vi.fn(),
    audit: vi.fn(),
    failure: "",
    active: null as string | null,
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
vi.mock("@/ai/orchestrator.server", () => ({ runPlanGeneration: mocks.generate }));
vi.mock("@/lib/planner.server", async (original) => ({
    ...(await original<typeof import("@/lib/planner.server")>()),
    persistProposal: mocks.persist,
    nextVersionNumber: async () => 1,
}));
vi.mock("@/lib/telemetry.server", () => ({
    claimIdempotencyKey: async () => ({ replay: null }),
    assertWithinQuota: vi.fn(),
    configuredDailyAiLimit: () => 10,
    recordAiUsage: vi.fn(),
    completeIdempotencyKey: vi.fn(),
    releaseIdempotencyKey: mocks.release,
    recordAudit: mocks.audit,
}));
import { generatePlan } from "@/lib/planning.functions";

beforeEach(() => {
    vi.clearAllMocks();
    mocks.failure = "";
    mocks.active = null;
    mocks.generate.mockResolvedValue({ data: { blocker: null }, meta: {} });
    mocks.persist.mockResolvedValue({ versionId: "saved", versionNumber: 1 });
    mocks.audit.mockResolvedValue(undefined);
});
function query(table: string) {
    const result = () => ({
        error: mocks.failure === table ? { message: "Synthetic read failure" } : null,
        data:
            table === "intake_cases"
                ? {
                      id: "case",
                      status: "READY_FOR_PLANNING",
                      raw_text: "Goal",
                      success_criteria: [],
                  }
                : table === "plans"
                  ? { id: "plan", active_version_id: mocks.active }
                  : [],
    });
    const builder = {
        select: () => builder,
        eq: () => builder,
        insert: () => builder,
        update: () => builder,
        maybeSingle: async () => result(),
        single: async () => result(),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return builder;
}
async function invoke() {
    return (generatePlan as unknown as (input: unknown) => Promise<unknown>)({
        data: {
            caseId: "case",
            scenario: "BALANCED",
            strategyPreference: null,
            idempotencyKey: "request-key",
        },
        context: { userId: "owner", supabase: { from: query } },
    });
}
for (const table of ["intake_cases", "case_context_facts", "plans"]) {
    it(`fails before AI when ${table} cannot be read`, async () => {
        mocks.failure = table;
        await expect(invoke()).rejects.toThrow(/load|read|failure/i);
        expect(mocks.generate).not.toHaveBeenCalled();
        expect(mocks.persist).not.toHaveBeenCalled();
    });
}
it("requires replan rather than regenerating over an accepted active version", async () => {
    mocks.active = "accepted-version";
    await expect(invoke()).rejects.toThrow(/replan|active plan/i);
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.persist).not.toHaveBeenCalled();
});
it("preserves the request claim after a successful save if later bookkeeping fails", async () => {
    mocks.audit.mockRejectedValue(new Error("Synthetic audit failure"));
    await expect(invoke()).rejects.toThrow(/saved.*refresh|refresh.*saved/i);
    expect(mocks.persist).toHaveBeenCalledOnce();
    expect(mocks.release).not.toHaveBeenCalled();
});
it("still returns a successfully saved initial plan", async () => {
    await expect(invoke()).resolves.toMatchObject({ versionId: "saved" });
});
