import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ insert: vi.fn(), read: vi.fn(), quota: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({
    supabaseAdmin: {
        from: () => {
            const query = {
                select: () => query,
                eq: () => query,
                gte: mock.quota,
                maybeSingle: mock.read,
                insert: mock.insert,
            };
            return query;
        },
    },
}));
import { claimIdempotencyKey, assertWithinQuota } from "@/lib/telemetry.server";
beforeEach(() => vi.resetAllMocks());
it("rejects simultaneous claims for an in-flight request", async () => {
    mock.insert
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { code: "23505" } });
    mock.read.mockResolvedValue({ data: { result_reference: null }, error: null });
    const results = await Promise.allSettled([
        claimIdempotencyKey("u", "PLAN", "key"),
        claimIdempotencyKey("u", "PLAN", "key"),
    ]);
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
});
it("replays a completed request without launching work", async () => {
    mock.insert.mockResolvedValue({ error: { code: "23505" } });
    mock.read.mockResolvedValue({
        data: { result_reference: { versionId: "saved" } },
        error: null,
    });
    await expect(claimIdempotencyKey("u", "PLAN", "key")).resolves.toEqual({
        replay: { versionId: "saved" },
    });
});
it("fails closed when the claim cannot be saved", async () => {
    mock.insert.mockResolvedValue({ error: { code: "08006" } });
    await expect(claimIdempotencyKey("u", "PLAN", "key")).rejects.toThrow("could not be reserved");
});
it("fails closed when usage cannot be checked", async () => {
    mock.quota.mockResolvedValue({ count: null, error: { message: "offline" } });
    await expect(assertWithinQuota("u", "PLAN", 10, 24)).rejects.toThrow(
        "usage could not be checked",
    );
});
