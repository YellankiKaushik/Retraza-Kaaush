import { mockPlanProposal } from "@/ai/mock-provider.server";

/** Offline provider-response fixture, distinct from the intentionally small mock plan. */
export function compactPlan() {
    const proposal = mockPlanProposal({ rawText: "Become a product manager in six months" });
    const action = proposal.nodes.find((node) => node.nodeType === "ACTION")!;
    const milestone = proposal.nodes.find((node) => node.nodeType === "MILESTONE")!;
    const initialNodes = proposal.nodes.length;
    proposal.edges.push({
        from: "milestone-review",
        to: "objective",
        edgeType: "PART_OF",
        hardDependency: false,
        rationale: "Review supports the objective.",
    });
    for (let index = 0; index < 2; index++)
        proposal.nodes.push({ ...milestone, tempId: "milestone-extra-" + index });
    for (let index = 0; index < 4; index++)
        proposal.nodes.push({
            ...action,
            tempId: "action-extra-" + index,
            strategyKey: index === 0 ? "conservative" : "balanced",
        });
    for (const node of proposal.nodes.slice(initialNodes))
        proposal.edges.push({
            from: node.tempId,
            to: "objective",
            edgeType: "PART_OF",
            hardDependency: false,
            rationale: "Part of the objective's compact execution path.",
        });
    for (const assumption of proposal.assumptions) assumption.importance = "MEDIUM";
    proposal.assumptions.push({ ...proposal.assumptions[0]! });
    proposal.risks.push({ ...proposal.risks[0]! });
    return proposal;
}
