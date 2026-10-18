import { expect, it } from "vitest";
import { mockIntakeAnalysis, mockPlanProposal } from "@/ai/mock-provider.server";
import { planningPrompt } from "@/ai/prompts.server";
import { validateProposal } from "@/lib/planner.server";

const scenarios = [
    ["career transition", "I want to transition to product design while working full-time.", []],
    [
        "PM development",
        "I want to become a product manager in six months with ten weekly hours.",
        [],
    ],
    ["technical learning", "I want to learn Python and publish a small analysis project.", []],
    ["small business", "I want to launch a small business without leaving my job.", []],
    ["vague goal", "Maybe I want things to improve.", []],
    [
        "contradictory constraints",
        "I want a portfolio with no time available.",
        [{ category: "CONSTRAINT", key: "capacity", value: "0 hours per week" }],
    ],
    ["missing information", "I want to change careers but don't know where to begin.", []],
    [
        "unrealistic timeline",
        "I want to become an expert engineer tomorrow with no experience.",
        [{ category: "CONSTRAINT", key: "deadline", value: "Tomorrow" }],
    ],
    ["competing strategies", "Should I learn through a course or an independent project?", []],
    [
        "resource change",
        "I want to continue the plan after losing weekly capacity.",
        [{ category: "RESOURCE", key: "capacity", value: "Reduced from 10 to 3 hours" }],
    ],
] as const;
for (const [name, rawText, facts] of scenarios) {
    it(`keeps ${name} input/context intact under deterministic structural validation`, () => {
        const analysis = mockIntakeAnalysis({ rawText });
        const proposal = mockPlanProposal({ rawText, objective: analysis.normalizedObjective });
        expect(() => validateProposal(proposal)).not.toThrow();
        expect(proposal.strategies).toHaveLength(2);
        expect(proposal.strategies.filter((strategy) => strategy.recommended)).toHaveLength(1);
        const prompt = planningPrompt({
            rawText,
            intentType: analysis.intentType,
            objective: analysis.normalizedObjective,
            facts: [...facts],
            scenario: "BALANCED",
        });
        expect(prompt.prompt).toContain(rawText);
        for (const fact of facts) expect(prompt.prompt).toContain(fact.value);
        expect(prompt.system).toContain("Never invent user facts");
        expect(proposal.feasibility.score).toBeGreaterThanOrEqual(0);
        expect(proposal.feasibility.score).toBeLessThanOrEqual(100);
        if (name === "vague goal" || name === "missing information")
            expect(analysis.questions.length).toBeGreaterThan(0);
    });
}
// Failed prerequisites and mixed circular dependencies have dedicated frontier
// regressions; structural fixture checks do not establish real-world plan usefulness.
