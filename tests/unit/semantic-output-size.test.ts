import { expect, it } from "vitest";
import { semanticPlan } from "../helpers/semantic-plan";
import { compileSemanticPlan, semanticPlanSchema } from "@/ai/semantic-plan.server";
import { semanticPlanningSystem } from "@/ai/prompts.server";
import { validateProposal } from "@/lib/planner.server";

it("fits a meaningful complete named plan comfortably below the ordinary output budget", () => {
    const fixture = semanticPlan();
    const json = JSON.stringify(fixture);
    expect(semanticPlanSchema.parse(JSON.parse(json))).toEqual(fixture);
    const proposal = compileSemanticPlan(fixture);
    expect(() => validateProposal(proposal, true)).not.toThrow();
    expect(fixture.strategies).toHaveLength(2);
    expect(fixture.strategies.find((s) => s.recommended)!.milestones).toHaveLength(3);
    expect(fixture.strategies.flatMap((s) => s.milestones.flatMap((m) => m.work))).toHaveLength(6);
    expect(proposal.assumptions).toHaveLength(3);
    expect(proposal.risks).toHaveLength(3);
    // Character heuristics are estimates, not the model's tokenizer or a compliance proof.
    const estimate = {
        characters: json.length,
        tokensAt4Chars: Math.ceil(json.length / 4),
        tokensAt3Chars: Math.ceil(json.length / 3),
    };
    expect(estimate.tokensAt3Chars).toBeLessThan(4000);
    console.info("SYNTHETIC_PLAN_SIZE_ESTIMATE", JSON.stringify(estimate));
});

it("targets efficient counts without conflicting graph output or weakening preservation", () => {
    const system = semanticPlanningSystem();
    expect(system).toContain("6-8 executable steps TOTAL");
    expect(system).toContain("retained accepted work");
    expect(system).toContain("References to later-declared work are permitted when acyclic");
    expect(system).toContain("Prefer compact JSON without indentation");
    expect(system).not.toContain("edges use node tempIds");
});
