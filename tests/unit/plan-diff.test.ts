import { describe, expect, it } from "vitest";

import { diffPlanNodes } from "@/lib/planner.server";
import type { GraphNode } from "@/domain/types";

const node = (id: string, title: string, overrides: Partial<GraphNode> = {}): GraphNode => ({
    id,
    title,
    node_type: overrides.node_type ?? "ACTION",
    description: overrides.description ?? "",
    status: overrides.status ?? "PENDING",
    priority_score: overrides.priority_score ?? null,
    depth: overrides.depth ?? 1,
    strategy_id: overrides.strategy_id ?? null,
    metadata: overrides.metadata ?? {},
});

describe("diffPlanNodes", () => {
    it("records added, removed and modified nodes for replan review", () => {
        const rows = diffPlanNodes({
            userId: "user-1",
            planId: "plan-1",
            fromVersionId: "version-1",
            toVersionId: "version-2",
            reasonCode: "CIRCUMSTANCE_CHANGED",
            beforeNodes: [
                node("old-1", "Interview users", { description: "Talk to three users." }),
                node("old-2", "Draft launch page"),
                node("removed-1", "Buy ads"),
            ],
            afterNodes: [
                node("new-1", "Interview users", { description: "Talk to five users." }),
                node("old-2", "Draft launch page"),
                node("added-1", "Create waitlist form"),
            ],
        });

        expect(rows).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    entity_id: "new-1",
                    change_type: "MODIFIED",
                    before_summary: "Interview users",
                    after_summary: "Interview users",
                }),
                expect.objectContaining({
                    entity_id: "added-1",
                    change_type: "ADDED",
                    after_summary: "Create waitlist form",
                }),
                expect.objectContaining({
                    entity_id: "removed-1",
                    change_type: "REMOVED",
                    before_summary: "Buy ads",
                }),
            ]),
        );
        expect(rows).toHaveLength(3);
    });
});
