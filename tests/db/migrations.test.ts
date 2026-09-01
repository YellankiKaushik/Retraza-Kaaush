import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
const allSql = migrationFiles
    .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
    .join("\n");

const privateTables = [
    "profiles",
    "intake_cases",
    "case_context_facts",
    "plans",
    "plan_versions",
    "strategies",
    "plan_nodes",
    "plan_edges",
    "assumptions",
    "risks",
    "actions",
    "check_ins",
    "plan_changes",
    "ai_usage_events",
    "idempotency_keys",
    "audit_events",
];

const guardedRelations = [
    ["case_context_facts", "guard_case_context_fact_owner"],
    ["plans", "guard_plan_owner"],
    ["plan_versions", "guard_plan_version_owner"],
    ["strategies", "guard_strategy_owner"],
    ["plan_nodes", "guard_plan_node_owner"],
    ["plan_edges", "guard_plan_edge_owner"],
    ["assumptions", "guard_assumption_owner"],
    ["risks", "guard_risk_owner"],
    ["actions", "guard_action_owner"],
    ["check_ins", "guard_check_in_owner"],
    ["plan_changes", "guard_plan_change_owner"],
] as const;

describe("Supabase migrations", () => {
    it("enables RLS on every private table", () => {
        for (const table of privateTables) {
            expect(allSql).toMatch(
                new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i"),
            );
        }
    });

    it("uses owner-scoped auth.uid policies for user-owned tables", () => {
        for (const table of privateTables) {
            expect(allSql).toMatch(new RegExp(`ON\\s+public\\.${table}[\\s\\S]+auth\\.uid\\(\\)\\s*=\\s*user_id`, "i"));
        }
    });

    it("guards cross-table ownership consistency for relational children", () => {
        for (const [table, trigger] of guardedRelations) {
            expect(allSql, table).toMatch(new RegExp(`CREATE\\s+TRIGGER\\s+${trigger}`, "i"));
        }
        expect(allSql).toContain("require_same_owner");
        expect(allSql).toMatch(/actions must reference an ACTION or EXPERIMENT node/i);
    });
});
