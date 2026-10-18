import { beforeEach, expect, it, vi } from "vitest";

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
vi.mock("@/lib/telemetry.server", () => ({ recordAudit: vi.fn() }));

import { deleteCase } from "@/lib/data.functions";
import { deleteContextFact, submitClarification, updateObjective } from "@/lib/intake.functions";

let row: { id: string } | null;
const filters: Array<[string, unknown]> = [];
beforeEach(() => {
    row = null;
    filters.length = 0;
});

function context() {
    const query = {
        delete: () => query,
        update: () => query,
        select: () => query,
        eq: (key: string, value: unknown) => {
            filters.push([key, value]);
            return query;
        },
        maybeSingle: async () => ({ data: row, error: null }),
        then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve({ data: row, error: null }).then(resolve),
    };
    return { userId: "owner", supabase: { from: () => query } };
}
for (const [name, fn, data] of [
    ["objective deletion", deleteCase, { caseId: "missing" }],
    ["context deletion", deleteContextFact, { factId: "missing" }],
    [
        "objective update",
        updateObjective,
        {
            caseId: "missing",
            title: "Goal",
            desiredOutcome: "Outcome",
            successCriteria: [],
            timeHorizon: null,
        },
    ],
    ["clarification", submitClarification, { caseId: "missing", answers: [] }],
] as const) {
    it(`${name} cannot report success for a missing or non-owned row`, async () => {
        const handler = fn as unknown as (input: unknown) => Promise<unknown>;
        await expect(handler({ data, context: context() })).rejects.toThrow(
            /not found|not be found|no longer available/i,
        );
        expect(filters).toContainEqual(["user_id", "owner"]);
    });
    it(`${name} succeeds only after an owned affected row is returned`, async () => {
        row = { id: "owned" };
        const handler = fn as unknown as (input: unknown) => Promise<unknown>;
        await expect(handler({ data, context: context() })).resolves.toMatchObject({ ok: true });
        expect(filters).toContainEqual(["user_id", "owner"]);
    });
}
