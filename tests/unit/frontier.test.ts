import { describe, expect, it } from "vitest";

import {
    computeFrontier,
    progressOf,
    findHardCycle,
    executionNodesForStrategy,
} from "@/domain/frontier";
import type { GraphEdge, GraphNode } from "@/domain/types";

const node = (overrides: Partial<GraphNode> & Pick<GraphNode, "id" | "title">): GraphNode => ({
    id: overrides.id,
    node_type: overrides.node_type ?? "ACTION",
    title: overrides.title,
    description: overrides.description ?? "",
    status: overrides.status ?? "PENDING",
    priority_score: overrides.priority_score ?? null,
    depth: overrides.depth ?? 1,
    strategy_id: overrides.strategy_id ?? null,
    metadata: overrides.metadata ?? {},
});

const edge = (
    overrides: Partial<GraphEdge> & Pick<GraphEdge, "from_node_id" | "to_node_id">,
): GraphEdge => ({
    id: overrides.id ?? crypto.randomUUID(),
    from_node_id: overrides.from_node_id,
    to_node_id: overrides.to_node_id,
    edge_type: overrides.edge_type ?? "REQUIRES",
    hard_dependency: overrides.hard_dependency ?? true,
    rationale: overrides.rationale ?? null,
});

describe("computeFrontier", () => {
    it("fails closed when a hard prerequisite is missing from the supplied graph", () => {
        const frontier = computeFrontier(
            [node({ id: "action", title: "Execute" })],
            [edge({ from_node_id: "missing", to_node_id: "action" })],
        );
        expect(frontier.ready).toHaveLength(0);
        expect(frontier.blocked).toHaveLength(1);
    });
    it("executes the selected strategy without requiring alternative-route work", () => {
        const nodes = [
            node({ id: "shared", title: "Shared prerequisite", status: "DONE" }),
            node({ id: "a", title: "Route A", strategy_id: "A" }),
            node({ id: "b", title: "Route B", strategy_id: "B" }),
        ];
        const edges = [edge({ from_node_id: "shared", to_node_id: "a" })];
        const chosen = executionNodesForStrategy(nodes, edges, "A");
        expect(computeFrontier(chosen, edges).ready.map((c) => c.node.id)).toEqual(["a"]);
        expect(progressOf(chosen)).toEqual({ done: 1, total: 2, percent: 50 });
        expect(executionNodesForStrategy(nodes, edges, "B").map((n) => n.id)).toEqual([
            "shared",
            "b",
        ]);
    });
    it("uses the same BLOCKED_BY direction for frontier and cycle validation", () => {
        const nodes = [node({ id: "a", title: "A" }), node({ id: "b", title: "B" })];
        const sameDependency = [
            edge({ from_node_id: "a", to_node_id: "b" }),
            edge({ from_node_id: "b", to_node_id: "a", edge_type: "BLOCKED_BY" }),
        ];
        expect(findHardCycle(nodes, sameDependency)).toBeNull();
        expect(
            findHardCycle(nodes, [
                edge({ from_node_id: "a", to_node_id: "b" }),
                edge({ from_node_id: "a", to_node_id: "b", edge_type: "BLOCKED_BY" }),
            ]),
        ).not.toBeNull();
    });
    it("marks actions ready only after hard prerequisites are terminal", () => {
        const prerequisite = node({
            id: "research",
            title: "Collect price evidence",
            status: "DONE",
        });
        const ready = node({ id: "call", title: "Call three lenders" });
        const blockedPrerequisite = node({
            id: "income-proof",
            title: "Prepare income proof",
            status: "PENDING",
        });
        const blocked = node({ id: "apply", title: "Submit mortgage preapproval" });

        const frontier = computeFrontier(
            [prerequisite, ready, blockedPrerequisite, blocked],
            [
                edge({ from_node_id: "research", to_node_id: "call" }),
                edge({ from_node_id: "income-proof", to_node_id: "apply" }),
            ],
        );

        expect(frontier.ready.map((candidate) => candidate.node.id)).toContain("call");
        expect(frontier.blocked.map((candidate) => candidate.node.id)).toContain("apply");
        expect(frontier.blocked[0]?.blockedBy.map((item) => item.id)).toContain("income-proof");
    });

    it("keeps dependents blocked when a hard prerequisite is skipped or cancelled", () => {
        const skipped = node({ id: "skipped", title: "Skipped prerequisite", status: "SKIPPED" });
        const cancelled = node({
            id: "cancelled",
            title: "Cancelled prerequisite",
            status: "CANCELLED",
        });
        const afterSkipped = node({
            id: "after-skipped",
            title: "Do work after skipped prerequisite",
        });
        const afterCancelled = node({
            id: "after-cancelled",
            title: "Do work after cancelled prerequisite",
        });

        const frontier = computeFrontier(
            [skipped, cancelled, afterSkipped, afterCancelled],
            [
                edge({ from_node_id: "skipped", to_node_id: "after-skipped" }),
                edge({ from_node_id: "cancelled", to_node_id: "after-cancelled" }),
            ],
        );

        expect(frontier.ready.map((candidate) => candidate.node.id)).not.toContain("after-skipped");
        expect(frontier.ready.map((candidate) => candidate.node.id)).not.toContain(
            "after-cancelled",
        );
        expect(frontier.blocked.map((candidate) => candidate.node.id)).toEqual(
            expect.arrayContaining(["after-skipped", "after-cancelled"]),
        );
    });

    it("prioritises high-leverage ready actions", () => {
        const simple = node({
            id: "simple",
            title: "Send one email",
            metadata: { impact: 2, urgency: 2, effortCost: 2, successLikelihood: 0.8 },
        });
        const leverage = node({
            id: "leverage",
            title: "Validate the core assumption",
            metadata: { impact: 4, urgency: 4, effortCost: 1, successLikelihood: 0.8 },
        });

        const frontier = computeFrontier(
            [simple, leverage, node({ id: "later", title: "Later action" })],
            [edge({ from_node_id: "leverage", to_node_id: "later" })],
        );

        expect(frontier.ready[0]?.node.id).toBe("leverage");
        expect(frontier.ready[0]?.reasons.join(" ")).toMatch(/Unblocks|High impact|Low effort/);
    });
});

describe("progressOf", () => {
    it("uses executable work and milestones instead of fabricated percentages", () => {
        const progress = progressOf([
            node({ id: "objective", title: "Objective", node_type: "OBJECTIVE", status: "DONE" }),
            node({ id: "milestone", title: "Milestone", node_type: "MILESTONE", status: "DONE" }),
            node({ id: "todo", title: "Do a task", status: "PENDING" }),
        ]);

        expect(progress).toEqual({ done: 1, total: 2, percent: 50 });
    });
});
