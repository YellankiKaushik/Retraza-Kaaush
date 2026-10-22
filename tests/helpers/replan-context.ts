import type { PlanProposal } from "@/ai/plan-contract";
import type { ReplanContext } from "@/lib/planner.server";

export function replanContext(proposal: PlanProposal): ReplanContext {
    const selected = proposal.strategies.find((strategy) => strategy.recommended)!;
    return {
        versionId: "active",
        planId: "plan",
        selectedStrategy: { key: selected.key, name: selected.name },
        strategies: proposal.strategies.map((strategy) => ({
            key: strategy.key,
            name: strategy.name,
            summary: strategy.summary,
            selected: strategy.key === selected.key,
        })),
        nodes: proposal.nodes.map((node) => ({
            tempId: node.tempId,
            nodeType: node.nodeType,
            title: node.title,
            description: node.description,
            status: node.tempId === "action-baseline" ? "DONE" : "PENDING",
            strategyKey: node.strategyKey,
            completionCriteria: node.completionCriteria,
            expectedResult: node.expectedResult,
            completedAt: node.tempId === "action-baseline" ? "2026-10-22T06:00:00.000Z" : null,
            result:
                node.tempId === "action-baseline" ? { note: "Verified baseline evidence" } : null,
        })),
        edges: structuredClone(proposal.edges),
    };
}
