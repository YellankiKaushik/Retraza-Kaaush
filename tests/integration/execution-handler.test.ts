import { expect, it, vi } from "vitest";
vi.mock("@/lib/telemetry.server", () => ({ recordAudit: vi.fn(async () => undefined) }));
import { updateActionState } from "@/lib/action-execution.server";
it("surfaces a failed transaction without reporting successful completion", async () => {
    const rpc = vi.fn(async () => ({ error: { message: "Connection interrupted" } }));
    await expect(
        updateActionState(
            { nodeId: "node", status: "DONE" },
            {
                supabase: { rpc } as unknown as Parameters<typeof updateActionState>[1]["supabase"],
                userId: "owner",
            },
        ),
    ).rejects.toThrow("Action could not be saved");
});
it("uses one transaction and preserves omitted fields", async () => {
    const rpc = vi.fn(async () => ({ error: null }));
    await expect(
        updateActionState(
            { nodeId: "node", status: "DONE" },
            {
                supabase: { rpc } as unknown as Parameters<typeof updateActionState>[1]["supabase"],
                userId: "owner",
            },
        ),
    ).resolves.toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("update_execution_node", {
        target_node_id: "node",
        patch: { status: "DONE" },
    });
});
