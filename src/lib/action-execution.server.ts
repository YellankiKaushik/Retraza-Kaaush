import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface ActionUpdateInput {
    nodeId: string;
    status: "PENDING" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "SKIPPED" | "DEFERRED";
    note?: string | undefined;
    dueAt?: string | null | undefined;
}

/** Authenticated execution logic; the caller supplies its owner-scoped client. */
export async function updateActionState(
    data: ActionUpdateInput,
    context: { supabase: SupabaseClient<Database>; userId: string },
) {
    const { supabase, userId } = context;

    const { error } = await supabase.rpc("update_execution_node", {
        target_node_id: data.nodeId,
        patch: {
            status: data.status,
            ...(data.note !== undefined ? { note: data.note } : {}),
            ...(data.dueAt !== undefined ? { dueAt: data.dueAt } : {}),
        },
    });
    if (error) throw new Error(`Action could not be saved: ${error.message}`);

    const telemetry = await import("@/lib/telemetry.server");
    await telemetry.recordAudit({
        userId,
        action: `ACTION_${data.status}`,
        resource: "plan_nodes",
        resourceId: data.nodeId,
    });

    return { ok: true };
}
