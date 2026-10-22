import { describe, expect, it, vi } from "vitest";
import { planProposalSchema } from "@/ai/plan-contract";
import { persistProposal, validateProposal } from "@/lib/planner.server";
import { compactPlan } from "../helpers/compact-plan";

// Persisted graph boundary remains strict after the Groq wire contract becomes semantic.
describe("graph assumption validation before persistence", () => {
    for (const [name, target] of [
        ["missing", null],
        ["empty", ""],
        ["dangling", "missing-node"],
        ["wrong type", "milestone-review"],
        ["strategy key", "balanced"],
    ] as const) {
        it("rejects a HIGH validator that is " + name, async () => {
            const proposal = compactPlan();
            proposal.assumptions[0]!.importance = "HIGH";
            proposal.assumptions[0]!.validationNodeTempId = target;
            const before = structuredClone(proposal);
            expect(planProposalSchema.safeParse(proposal).success).toBe(true);
            expect(() => validateProposal(proposal, true)).toThrow();
            const rpc = vi.fn();
            await expect(
                persistProposal({
                    supabase: { rpc } as never,
                    proposal,
                    userId: "owner",
                    planId: "plan",
                    caseId: "case",
                    scenario: "BALANCED",
                    parentVersionId: null,
                    versionNumber: 1,
                    modelAlias: "PRIMARY",
                    generationSource: { provider: "groq", model: "offline" },
                    promptVersion: "test",
                    activate: true,
                }),
            ).rejects.toMatchObject({
                code: "PLAN_VALIDATION_FAILED",
                validationRule: "assumption-validator",
            });
            expect(rpc).not.toHaveBeenCalled();
            expect(proposal).toEqual(before);
        });
    }
    for (const nodeType of ["ACTION", "EXPERIMENT"] as const)
        it("accepts a HIGH assumption linked to an existing " + nodeType, () => {
            const proposal = compactPlan();
            proposal.nodes.find((n) => n.tempId === "action-baseline")!.nodeType = nodeType;
            proposal.assumptions[0]!.importance = "HIGH";
            proposal.assumptions[0]!.validationNodeTempId = "action-baseline";
            expect(() => validateProposal(proposal, true)).not.toThrow();
        });
    it("still rejects a dangling optional validator", () => {
        const proposal = compactPlan();
        proposal.assumptions[0]!.validationNodeTempId = "absent";
        expect(() => validateProposal(proposal, true)).toThrow();
    });
});
