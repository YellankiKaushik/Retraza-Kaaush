import { describe, expect, it, vi } from "vitest";
import { mockPlanProposal } from "@/ai/mock-provider.server";
import { persistProposal, validateProposal } from "@/lib/planner.server";
import { compactPlan } from "../helpers/compact-plan";

describe("live compact planning profile", () => {
    it("rejects an abbreviated outline while keeping deterministic mock fixtures valid", () => {
        const outline = mockPlanProposal({ rawText: "Become a product manager" });
        expect(() => validateProposal(outline)).not.toThrow();
        expect(() => validateProposal(outline, true)).toThrow(
            "three to five recommended milestones",
        );
    });

    it("accepts a complete compact proposal without modifying its graph", () => {
        const proposal = compactPlan();
        const before = structuredClone(proposal);
        expect(() => validateProposal(proposal, true)).not.toThrow();
        expect(proposal).toEqual(before);
    });

    it("rejects plans with fewer than six executable actions or experiments", () => {
        const proposal = compactPlan();
        const actions = proposal.nodes.filter((node) => node.nodeType === "ACTION");
        for (const node of actions.slice(1)) node.nodeType = "REQUIREMENT";
        expect(() => validateProposal(proposal, true)).toThrow("six to twelve executable nodes");
    });

    it("rejects an alternative strategy without its own executable branch", () => {
        const proposal = compactPlan();
        for (const node of proposal.nodes)
            if (node.strategyKey === "conservative") node.strategyKey = "balanced";
        expect(() => validateProposal(proposal, true)).toThrow(
            "executable branch for each strategy",
        );
    });

    it("enforces the documented graph size bounds", () => {
        const proposal = compactPlan();
        while (proposal.nodes.length < 25)
            proposal.nodes.push({
                ...proposal.nodes[1]!,
                tempId: "extra-" + proposal.nodes.length,
            });
        expect(() => validateProposal(proposal, true)).toThrow("at most 24 nodes and 48 edges");
        const tooManyEdges = compactPlan();
        while (tooManyEdges.edges.length < 49)
            tooManyEdges.edges.push({ ...tooManyEdges.edges[0]! });
        expect(() => validateProposal(tooManyEdges, true)).toThrow("at most 24 nodes and 48 edges");
    });

    it("requires risk and assumption coverage and executable validation for HIGH assumptions", () => {
        const proposal = compactPlan();
        proposal.risks.pop();
        expect(() => validateProposal(proposal, true)).toThrow("three to five risks");
        proposal.risks.push({ ...proposal.risks[0]! });
        proposal.assumptions.pop();
        expect(() => validateProposal(proposal, true)).toThrow("three to five assumptions");
        proposal.assumptions.push({ ...proposal.assumptions[0]! });
        proposal.assumptions[0]!.importance = "HIGH";
        proposal.assumptions[0]!.validationNodeTempId = "milestone-review";
        expect(() => validateProposal(proposal, true)).toThrow(
            "validating every high-importance assumption",
        );
    });

    it("preserves explicit blocker handling instead of fabricating a complete plan", () => {
        const proposal = mockPlanProposal({ rawText: "Need more information" });
        proposal.blocker = "Confirm the available resources before planning.";
        expect(() => validateProposal(proposal, true)).not.toThrow();
    });

    it("rejects incomplete real-provider plans before making any persistence RPC", async () => {
        const rpc = vi.fn();
        await expect(
            persistProposal({
                supabase: { rpc } as never,
                userId: "temporary-user",
                planId: "temporary-plan",
                caseId: "temporary-case",
                proposal: mockPlanProposal({ rawText: "Become a PM" }),
                scenario: "BALANCED",
                parentVersionId: null,
                versionNumber: 1,
                modelAlias: "PRIMARY",
                generationSource: { provider: "gemini", model: "configured-model" },
                promptVersion: "v2-compact",
                activate: true,
            }),
        ).rejects.toMatchObject({ code: "PLAN_VALIDATION_FAILED" });
        expect(rpc).not.toHaveBeenCalled();
    });
});
