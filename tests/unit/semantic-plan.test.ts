import { describe, expect, it } from "vitest";
import { compileSemanticPlan, semanticPlanSchema } from "@/ai/semantic-plan.server";
import { validateProposal } from "@/lib/planner.server";
import { semanticPlan, legacySemanticPlan } from "../helpers/semantic-plan";
import { replanContext } from "../helpers/replan-context";
import { compactPlan } from "../helpers/compact-plan";

describe("deterministic semantic graph compiler", () => {
    it("allows the first-listed work to depend on later work without changing direction", () => {
        const s = semanticPlan();
        s.strategies[0]!.milestones[0]!.work[0]!.dependency = {
            kind: "AFTER",
            workKeys: ["roles"],
        };
        const before = structuredClone(s);
        const p = compileSemanticPlan(s);
        const first = p.nodes.find((n) => n.title === "Measure weekly study capacity")!;
        const later = p.nodes.find((n) => n.title === "Compare three PM role descriptions")!;
        expect(p.edges).toContainEqual(
            expect.objectContaining({
                from: later.tempId,
                to: first.tempId,
                hardDependency: true,
            }),
        );
        expect(p.edges.some((e) => e.hardDependency && e.to === later.tempId)).toBe(false);
        expect(() => validateProposal(p, true)).not.toThrow();
        expect(s).toEqual(before);
    });
    it("rejects an actual named A-B-A cycle, not a declaration-order difference", () => {
        const s = semanticPlan();
        const work = s.strategies[0]!.milestones[0]!.work;
        work[0]!.dependency = { kind: "AFTER", workKeys: [work[1]!.key] };
        work[1]!.dependency = { kind: "AFTER", workKeys: [work[0]!.key] };
        expect(() => compileSemanticPlan(s)).toThrowError(
            expect.objectContaining({ validationRule: "dependency-cycle" }),
        );
    });
    it("compiles previously valid indexed output identically to the named contract", () => {
        const old = legacySemanticPlan();
        const before = structuredClone(old);
        expect(compileSemanticPlan(old)).toEqual(compileSemanticPlan(semanticPlan()));
        expect(old).toEqual(before);
    });
    it("preserves explicit multi-milestone and multiple prerequisites without chaining independent work", () => {
        const s = semanticPlan();
        const p = compileSemanticPlan(s);
        const byTitle = (title: string) => p.nodes.find((n) => n.title === title)!.tempId;
        const first = byTitle("Measure weekly study capacity");
        const independent = byTitle("Compare three PM role descriptions");
        const study = byTitle("Write one product case study");
        const review = byTitle("Ask two PMs to review the study");
        const hard = p.edges.filter((e) => e.hardDependency);
        expect(hard).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ from: first, to: study }),
                expect.objectContaining({ from: independent, to: study }),
                expect.objectContaining({ from: study, to: review }),
            ]),
        );
        expect(hard.some((e) => e.to === first || e.to === independent)).toBe(false);
    });
    for (const target of [6, 99])
        it("reports the exact legacy prerequisite path and out-of-range target " + target, () => {
            const s = legacySemanticPlan();
            s.strategies[0]!.milestones[1]!.work[0]!.prerequisiteIndexes = [target];
            expect(() => compileSemanticPlan(s)).toThrowError(
                expect.objectContaining({
                    validationRule: "dangling-edge",
                    referenceTargetIndex: target,
                    issues: [
                        {
                            code: "custom",
                            path: [
                                "strategies",
                                0,
                                "milestones",
                                1,
                                "work",
                                0,
                                "prerequisiteIndexes",
                                0,
                            ],
                        },
                    ],
                }),
            );
        });
    for (const [strategyIndex, workIndex, field] of [
        [0, 99, "workIndex"],
        [9, 0, "strategyIndex"],
    ] as const)
        it("reports the exact legacy bottleneck " + field, () => {
            const s = legacySemanticPlan();
            s.bottleneck = { strategyIndex, workIndex };
            expect(() => compileSemanticPlan(s)).toThrowError(
                expect.objectContaining({
                    referenceTargetIndex: field === "strategyIndex" ? strategyIndex : workIndex,
                    issues: [{ code: "custom", path: ["bottleneck", field] }],
                }),
            );
        });
    for (const workKey of ["absent", "interview", "capacity"])
        it(
            "rejects undeclared, foreign or self dependency " + workKey + " at its exact path",
            () => {
                const s = semanticPlan();
                s.strategies[0]!.milestones[0]!.work[0]!.dependency = {
                    kind: "AFTER",
                    workKeys: [workKey],
                };
                const before = structuredClone(s);
                expect(() => compileSemanticPlan(s)).toThrowError(
                    expect.objectContaining({
                        validationRule:
                            workKey === "capacity" ? "dependency-self" : "dangling-edge",
                        issues: [
                            {
                                code: "custom",
                                path: [
                                    "strategies",
                                    0,
                                    "milestones",
                                    0,
                                    "work",
                                    0,
                                    "dependency",
                                    "workKeys",
                                    0,
                                ],
                            },
                        ],
                    }),
                );
                expect(s).toEqual(before);
            },
        );
    it("rejects foreign strategy bottleneck and HIGH validators without borrowing another strategy's work", () => {
        const s = semanticPlan();
        s.bottleneck = { strategy: "SECOND", workKey: "capacity" };
        expect(() => compileSemanticPlan(s)).toThrowError(
            expect.objectContaining({
                issues: [{ code: "custom", path: ["bottleneck", "workKey"] }],
            }),
        );
        s.bottleneck = null;
        s.assumptions.first.validator.workKey = "interview";
        expect(() => compileSemanticPlan(s)).toThrowError(
            expect.objectContaining({
                validationRule: "assumption-validator",
                issues: [
                    { code: "custom", path: ["assumptions", "first", "validator", "workKey"] },
                ],
            }),
        );
    });
    it("rejects extra dependencies on independent work rather than silently dropping them", () => {
        const s = semanticPlan();
        Object.assign(s.strategies[0]!.milestones[0]!.work[0]!.dependency, {
            workKeys: ["capacity"],
        });
        expect(semanticPlanSchema.safeParse(s).success).toBe(false);
        expect(() => compileSemanticPlan(s)).toThrow();
    });
    it("retains legacy acyclic forward references but rejects legacy self references and cycles", () => {
        const s = legacySemanticPlan();
        s.strategies[0]!.milestones[0]!.work[0]!.prerequisiteIndexes = [1];
        expect(() => compileSemanticPlan(s)).not.toThrow();
        s.strategies[0]!.milestones[0]!.work[0]!.prerequisiteIndexes = [0];
        expect(() => compileSemanticPlan(s)).toThrowError(
            expect.objectContaining({
                validationRule: "dependency-self",
                referenceTargetIndex: 0,
            }),
        );
        s.strategies[0]!.milestones[0]!.work[0]!.prerequisiteIndexes = [1];
        s.strategies[0]!.milestones[0]!.work[1]!.prerequisiteIndexes = [0];
        expect(() => compileSemanticPlan(s)).toThrowError(
            expect.objectContaining({ validationRule: "dependency-cycle" }),
        );
    });
    for (const count of [2, 3, 4, 5, 6])
        it(
            "enforces single-collection assumption cardinality " + count + " without padding",
            () => {
                const s = semanticPlan();
                const slots: Record<string, unknown> = { ...s.assumptions };
                if (count === 2) delete slots.third;
                if (count >= 4)
                    slots.fourth = {
                        ...s.assumptions.second,
                        statement: "Review feedback will identify actionable improvements.",
                    };
                if (count >= 5)
                    slots.fifth = {
                        ...s.assumptions.third,
                        statement: "Internal shadowing opportunities can be discussed.",
                    };
                if (count === 6)
                    slots.sixth = {
                        ...s.assumptions.third,
                        statement: "A sixth assumption must not be silently discarded.",
                    };
                const raw = { ...s, assumptions: slots };
                const before = structuredClone(raw);
                if (count >= 3 && count <= 5)
                    expect(
                        compileSemanticPlan(semanticPlanSchema.parse(raw)).assumptions,
                    ).toHaveLength(count);
                else expect(semanticPlanSchema.safeParse(raw).success).toBe(false);
                expect(raw).toEqual(before);
            },
        );
    it("automatically carries omitted accepted completion from legacy plans without fabricated work", () => {
        const context = replanContext(compactPlan());
        const old = context.nodes.find((n) => n.status === "DONE")!;
        const candidate = compileSemanticPlan(semanticPlan(), context);
        expect(candidate.nodes.find((n) => n.tempId === old.tempId)).toMatchObject({
            title: old.title,
            nodeType: old.nodeType,
            completionCriteria: old.completionCriteria,
            expectedResult: old.expectedResult,
            strategyKey: old.strategyKey,
        });
        expect(() => validateProposal(candidate, true, context)).not.toThrow();
    });
    it("rejects regeneration of completed work under a fresh semantic identity", () => {
        const s = semanticPlan();
        const context = replanContext(compileSemanticPlan(s));
        context.nodes.find((n) => n.nodeType === "ACTION")!.status = "DONE";
        expect(() => compileSemanticPlan(s, context)).toThrow(/duplicating/i);
    });
    it("builds stable owned branches, milestones, executable validators and connected dependencies", () => {
        const semantic = semanticPlan();
        const before = structuredClone(semantic);
        const a = compileSemanticPlan(semantic);
        expect(a).toEqual(compileSemanticPlan(semantic));
        expect(semantic).toEqual(before);
        expect(new Set(a.nodes.map((n) => n.tempId)).size).toBe(a.nodes.length);
        for (const strategy of a.strategies)
            expect(
                a.nodes.some((n) => n.strategyKey === strategy.key && n.nodeType === "ACTION"),
            ).toBe(true);
        const high = a.assumptions.find((a) => a.importance === "HIGH")!;
        expect(a.nodes.find((n) => n.tempId === high.validationNodeTempId)?.nodeType).toBe(
            "ACTION",
        );
        expect(
            a.nodes.filter(
                (n) => n.nodeType === "MILESTONE" && n.strategyKey === a.strategies[0]!.key,
            ),
        ).toHaveLength(3);
        expect(() => validateProposal(a, true)).not.toThrow();
    });
    it("supports experiment-owned HIGH validators", () => {
        const s = semanticPlan();
        const c = s.strategies[0]!.milestones[0]!.work[0]!.content;
        if (c.source === "new") c.nodeType = "EXPERIMENT";
        const p = compileSemanticPlan(s);
        const high = p.assumptions.find((a) => a.importance === "HIGH")!;
        expect(p.nodes.find((n) => n.tempId === high.validationNodeTempId)?.nodeType).toBe(
            "EXPERIMENT",
        );
    });
    it("rejects HIGH assumptions without a validator instead of manufacturing work", () => {
        const s = semanticPlan();
        expect(
            semanticPlanSchema.safeParse({
                ...s,
                assumptions: {
                    ...s.assumptions,
                    first: { ...s.assumptions.first, validator: null },
                },
            }).success,
        ).toBe(false);
    });
    for (const statement of ["", "  ", "TBD", "N/A", "placeholder", "x".repeat(401)])
        it("does not count placeholder assumption " + JSON.stringify(statement), () => {
            const s = semanticPlan();
            expect(
                semanticPlanSchema.safeParse({
                    ...s,
                    assumptions: { ...s.assumptions, third: { ...s.assumptions.third, statement } },
                }).success,
            ).toBe(false);
        });
    it("rejects duplicate padding and dangling validators without changing content", () => {
        const s = semanticPlan();
        s.assumptions.third.statement = s.assumptions.second.statement;
        expect(() => compileSemanticPlan(s)).toThrow(/distinct/i);
        s.assumptions.third.statement = "An internal product team exists.";
        s.assumptions.first.validator.workKey = "absent";
        expect(() => compileSemanticPlan(s)).toThrow(/owning strategy/i);
    });
    it("resolves a validator only inside its declared owning strategy", () => {
        const s = semanticPlan();
        s.assumptions.first.strategy = "SECOND";
        s.assumptions.first.validator.workKey = "interview";
        const p = compileSemanticPlan(s);
        expect(
            p.nodes.find((n) => n.tempId === p.assumptions[0]!.validationNodeTempId)?.strategyKey,
        ).toBe(p.strategies[1]!.key);
        expect(
            semanticPlanSchema.safeParse({
                ...s,
                assumptions: {
                    ...s.assumptions,
                    first: {
                        ...s.assumptions.first,
                        validator: { workKey: "capacity", strategy: "FIRST" },
                    },
                },
            }).success,
        ).toBe(false);
    });
    it("rejects legacy distributed collections instead of silently merging them", () => {
        const s = semanticPlan();
        expect(semanticPlanSchema.safeParse({ ...s, unvalidatedAssumptions: [] }).success).toBe(
            false,
        );
        const raw = structuredClone(s);
        Object.assign(raw.strategies[0]!.milestones[0]!.work[0]!, { assumptions: [] });
        expect(semanticPlanSchema.safeParse(raw).success).toBe(false);
    });
    for (const [name, mutate] of [
        [
            "empty strategy",
            (s: ReturnType<typeof semanticPlan>) => {
                s.strategies[1]!.milestones = [];
            },
        ],
        [
            "empty work",
            (s: ReturnType<typeof semanticPlan>) => {
                s.strategies[1]!.milestones[0]!.work = [];
            },
        ],
        [
            "missing milestones",
            (s: ReturnType<typeof semanticPlan>) => {
                s.strategies[0]!.milestones.pop();
            },
        ],
        [
            "dangling prerequisite",
            (s: ReturnType<typeof semanticPlan>) => {
                s.strategies[0]!.milestones[0]!.work[0]!.dependency = {
                    kind: "AFTER",
                    workKeys: ["absent"],
                };
            },
        ],
        [
            "cycle",
            (s: ReturnType<typeof semanticPlan>) => {
                s.strategies[0]!.milestones[0]!.work[0]!.dependency = {
                    kind: "AFTER",
                    workKeys: ["roles"],
                };
                s.strategies[0]!.milestones[0]!.work[1]!.dependency = {
                    kind: "AFTER",
                    workKeys: ["capacity"],
                };
            },
        ],
        [
            "duplicate identity",
            (s: ReturnType<typeof semanticPlan>) => {
                s.strategies[0]!.milestones[0]!.work[1]!.key = "capacity";
            },
        ],
        [
            "foreign accepted reference",
            (s: ReturnType<typeof semanticPlan>) => {
                s.strategies[0]!.milestones[0]!.work[0]!.content = {
                    source: "accepted",
                    tempId: "foreign",
                };
            },
        ],
    ] as const)
        it("rejects " + name + " without mutating input", () => {
            const s = semanticPlan();
            mutate(s);
            const before = structuredClone(s);
            expect(() => compileSemanticPlan(s)).toThrow();
            expect(s).toEqual(before);
        });
    it("preserves completed work, selected strategy and references across recompilation", () => {
        const s = semanticPlan();
        const p = compileSemanticPlan(s);
        const context = replanContext(p);
        const first = context.nodes.find((n) => n.nodeType === "ACTION")!;
        first.status = "DONE";
        first.completedAt = "2026-10-22T10:00:00Z";
        first.result = { note: "Evidence" };
        const before = structuredClone(context);
        s.strategies[0]!.milestones[0]!.work[0]!.content = {
            source: "accepted",
            tempId: first.tempId,
        };
        const candidate = compileSemanticPlan(s, context);
        expect(candidate.nodes.find((n) => n.tempId === first.tempId)).toMatchObject({
            title: first.title,
            nodeType: first.nodeType,
            strategyKey: first.strategyKey,
        });
        expect(candidate.strategies.map((s) => [s.key, s.name])).toEqual(
            context.strategies.map((s) => [s.key, s.name]),
        );
        expect(() => validateProposal(candidate, true, context)).not.toThrow();
        expect(context).toEqual(before);
    });
});
