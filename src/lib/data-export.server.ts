import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function readUserExport(supabase: SupabaseClient<Database>, userId: string) {
    const tables = [
        "intake_cases",
        "case_context_facts",
        "plans",
        "plan_versions",
        "plan_nodes",
        "plan_edges",
        "actions",
        "strategies",
        "assumptions",
        "risks",
        "plan_changes",
        "check_ins",
    ] as const;
    const out: Record<string, unknown[]> = {};
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
        if (error) throw new Error("Your data export could not be completed. Please try again.");
        out[table] = data ?? [];
    }
    return out;
}
