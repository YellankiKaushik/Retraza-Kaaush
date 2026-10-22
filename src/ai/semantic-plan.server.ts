import { createHash } from "node:crypto";
import { z } from "zod";
import { planProposalSchema, type PlanProposal } from "./plan-contract";
import { DomainError, validateProposal, type ReplanContext } from "@/lib/planner.server";

const node = planProposalSchema.shape.nodes.innerType().element;
const strategy = planProposalSchema.shape.strategies.innerType().element;
const meaningfulStatement = z
    .string()
    .describe("A distinct, concrete assumption, never empty or a placeholder.")
    .refine(
        (value) =>
            !!value.trim() &&
            value.trim().length <= 400 &&
            !/^(?:n\/a|none|unknown|tbd|placeholder|-+)$/i.test(value.trim()),
        "Assumptions must contain meaningful statements.",
    );
const assumptionTarget = z
    .object({
        workIndex: z
            .number()
            .int()
            .nonnegative()
            .describe(
                "Zero-based work index in the owning strategy's flattened milestone work list.",
            ),
    })
    .strict();
const assumptionBase = {
    statement: meaningfulStatement,
    strategy: z
        .enum(["FIRST", "SECOND"])
        .describe(
            "Owning strategy in strategies array order; validator work must belong to this strategy.",
        ),
};
const semanticAssumption = z.discriminatedUnion("importance", [
    z
        .object({ ...assumptionBase, importance: z.literal("HIGH"), validator: assumptionTarget })
        .strict(),
    z
        .object({
            ...assumptionBase,
            importance: z.enum(["LOW", "MEDIUM"]),
            validator: assumptionTarget.nullable(),
        })
        .strict(),
]);
// Use the documented strict-compatible required/nullable object shape rather than
// depending on undocumented provider support for minItems/maxItems.
export const semanticAssumptionsSchema = z
    .object({
        first: semanticAssumption,
        second: semanticAssumption,
        third: semanticAssumption,
        fourth: semanticAssumption.nullable(),
        fifth: semanticAssumption.nullable(),
    })
    .strict();
const key = z.string().min(1).max(40).describe("Stable local work key. Reuse for unchanged work.");
const work = node
    .pick({
        title: true,
        description: true,
        impact: true,
        urgency: true,
        effortCost: true,
        successLikelihood: true,
        completionCriteria: true,
        expectedResult: true,
        estimatedMinutes: true,
    })
    .extend({ nodeType: z.enum(["ACTION", "EXPERIMENT"]) })
    .strict();
const step = z
    .object({
        key,
        content: z.discriminatedUnion("source", [
            work.extend({ source: z.literal("new") }).strict(),
            z.object({ source: z.literal("accepted"), tempId: z.string() }).strict(),
        ]),
        prerequisiteIndexes: z
            .array(z.number().int().nonnegative())
            .describe(
                "Zero-based indexes in this strategy's flattened milestone work list, never node IDs. Empty means ready. No self dependencies or cycles.",
            ),
    })
    .strict();

export const legacySemanticPlanSchema = z
    .object({
        normalizedObjective: planProposalSchema.shape.normalizedObjective,
        strategies: z
            .array(
                strategy
                    .omit({ key: true })
                    .extend({
                        milestones: z
                            .array(
                                z
                                    .object({
                                        key,
                                        title: z.string().min(1),
                                        description: z.string(),
                                        work: z.array(step).min(1),
                                    })
                                    .strict(),
                            )
                            .min(1),
                    })
                    .strict(),
            )
            .length(2),
        conditions: z.array(
            z
                .object({
                    key,
                    nodeType: z.enum(["REQUIREMENT", "RESOURCE", "CONSTRAINT", "GAP", "METRIC"]),
                    title: z.string().min(1),
                    description: z.string(),
                })
                .strict(),
        ),
        assumptions: semanticAssumptionsSchema.describe(
            "The ONLY assumption collection: three mandatory assumptions and up to two additional assumptions, using JSON null for unused fourth/fifth slots.",
        ),
        risks: planProposalSchema.shape.risks,
        feasibility: planProposalSchema.shape.feasibility,
        confidence: planProposalSchema.shape.confidence,
        summary: planProposalSchema.shape.summary,
        bottleneck: z
            .object({
                strategyIndex: z.number().int().nonnegative(),
                workIndex: z.number().int().nonnegative(),
            })
            .strict()
            .nullable(),
        bottleneckReason: planProposalSchema.shape.bottleneckReason,
        blocker: planProposalSchema.shape.blocker,
    })
    .strict();
export type LegacySemanticPlan = z.infer<typeof legacySemanticPlanSchema>;

const namedTarget = z.object({ workKey: key }).strict();
const namedAssumption = z.discriminatedUnion("importance", [
    z.object({ ...assumptionBase, importance: z.literal("HIGH"), validator: namedTarget }).strict(),
    z
        .object({
            ...assumptionBase,
            importance: z.enum(["LOW", "MEDIUM"]),
            validator: namedTarget.nullable(),
        })
        .strict(),
]);
const namedStep = step
    .omit({ prerequisiteIndexes: true })
    .extend({
        dependency: z.discriminatedUnion("kind", [
            z.object({ kind: z.literal("INDEPENDENT") }).strict(),
            z
                .object({
                    kind: z.literal("AFTER"),
                    workKeys: z.array(key).min(1),
                })
                .strict(),
        ]),
    })
    .strict();
const namedMilestone =
    legacySemanticPlanSchema.shape.strategies.element.shape.milestones.element.extend({
        work: z.array(namedStep).min(1),
    });

/** Current provider contract: copy declared work keys, never count flattened indexes. */
export const semanticPlanSchema = legacySemanticPlanSchema
    .extend({
        strategies: z
            .array(
                legacySemanticPlanSchema.shape.strategies.element.extend({
                    milestones: z.array(namedMilestone).min(1),
                }),
            )
            .length(2),
        assumptions: z
            .object({
                first: namedAssumption,
                second: namedAssumption,
                third: namedAssumption,
                fourth: namedAssumption.nullable(),
                fifth: namedAssumption.nullable(),
            })
            .strict(),
        bottleneck: z
            .object({
                strategy: z.enum(["FIRST", "SECOND"]),
                workKey: key,
            })
            .strict()
            .nullable(),
    })
    .strict();
export type SemanticPlan = z.infer<typeof semanticPlanSchema>;

function referenceFailure(
    message: string,
    rule: string,
    path: (string | number)[],
    target: string | number,
): never {
    throw Object.assign(
        new DomainError("PLAN_VALIDATION_FAILED", message + " (" + path.join(".") + ").", rule),
        {
            issues: [{ code: "custom", path }],
            // Never retain model-provided key text in diagnostic metadata.
            referenceTargetIndex: typeof target === "number" ? target : null,
        },
    );
}

function indexedPlan(input: SemanticPlan): LegacySemanticPlan {
    const workLists = input.strategies.map((s) => s.milestones.flatMap((m) => m.work));
    const positions = workLists.map((items, si) => {
        const map = new Map<string, number>();
        let index = 0;
        input.strategies[si]!.milestones.forEach((m, mi) =>
            m.work.forEach((item, wi) => {
                if (map.has(item.key))
                    referenceFailure(
                        "Work keys must be unique within a strategy",
                        "duplicate-node",
                        ["strategies", si, "milestones", mi, "work", wi, "key"],
                        item.key,
                    );
                map.set(item.key, index++);
            }),
        );
        return map;
    });
    const resolve = (si: number, workKey: string, path: (string | number)[], rule: string) => {
        const target = positions[si]?.get(workKey);
        if (target === undefined)
            referenceFailure(
                "Reference must identify declared work in its owning strategy",
                rule,
                path,
                workKey,
            );
        return target;
    };
    const strategies = input.strategies.map((s, si) => {
        let current = 0;
        return {
            ...s,
            milestones: s.milestones.map((m, mi) => ({
                ...m,
                work: m.work.map((item, wi) => {
                    const index = current++;
                    const { dependency, ...content } = item;
                    const prerequisiteIndexes =
                        dependency.kind === "INDEPENDENT"
                            ? []
                            : dependency.workKeys.map((workKey, di) => {
                                  const path = [
                                      "strategies",
                                      si,
                                      "milestones",
                                      mi,
                                      "work",
                                      wi,
                                      "dependency",
                                      "workKeys",
                                      di,
                                  ];
                                  const target = resolve(si, workKey, path, "dangling-edge");
                                  if (target >= index)
                                      referenceFailure(
                                          "AFTER must reference earlier declared work, never itself or future work",
                                          "dependency-cycle",
                                          path,
                                          workKey,
                                      );
                                  return target;
                              });
                    return { ...content, prerequisiteIndexes };
                }),
            })),
        };
    });
    const assumptions = Object.fromEntries(
        Object.entries(input.assumptions).map(([slot, a]) => [
            slot,
            a === null
                ? null
                : {
                      ...a,
                      validator:
                          a.validator === null
                              ? null
                              : {
                                    workIndex: resolve(
                                        a.strategy === "FIRST" ? 0 : 1,
                                        a.validator.workKey,
                                        ["assumptions", slot, "validator", "workKey"],
                                        "assumption-validator",
                                    ),
                                },
                  },
        ]),
    );
    const bottleneck =
        input.bottleneck === null
            ? null
            : {
                  strategyIndex: input.bottleneck.strategy === "FIRST" ? 0 : 1,
                  workIndex: resolve(
                      input.bottleneck.strategy === "FIRST" ? 0 : 1,
                      input.bottleneck.workKey,
                      ["bottleneck", "workKey"],
                      "dangling-edge",
                  ),
              };
    return legacySemanticPlanSchema.parse({ ...input, strategies, assumptions, bottleneck });
}

export function compileSemanticPlan(
    raw: SemanticPlan | LegacySemanticPlan,
    continuity?: ReplanContext,
): PlanProposal {
    const current = semanticPlanSchema.safeParse(raw);
    // Existing valid saved/synthetic legacy output remains readable, never emitted to providers.
    const input = current.success ? indexedPlan(current.data) : legacySemanticPlanSchema.parse(raw);
    return compileIndexedPlan(input, continuity);
}

function fail(message: string, rule: string): never {
    throw new DomainError("PLAN_VALIDATION_FAILED", message, rule);
}
function id(...path: string[]) {
    return "n-" + createHash("sha256").update(JSON.stringify(path)).digest("hex").slice(0, 30);
}

/** Compile declared semantic ownership, never repair a model-produced graph or invent work. */
function compileIndexedPlan(raw: LegacySemanticPlan, continuity?: ReplanContext): PlanProposal {
    const input = legacySemanticPlanSchema.parse(raw);
    const nodes: PlanProposal["nodes"] = [];
    const edges: PlanProposal["edges"] = [];
    const assumptionSlots = Object.values(input.assumptions).filter((a) => a !== null);
    if (
        new Set(assumptionSlots.map((a) => a.statement.trim().toLowerCase())).size !==
        assumptionSlots.length
    )
        fail(
            "Assumptions must describe distinct conditions, not duplicate padding.",
            "assumptions-content",
        );
    const workIdsByStrategy: string[][] = [];
    const used = new Set<string>();
    const add = (n: PlanProposal["nodes"][number]) => {
        if (!n.title.trim() || !n.description.trim())
            fail("Semantic work and conditions need meaningful content.", "graph-integrity");
        if (used.has(n.tempId))
            fail("Semantic work keys must be unique within their owner.", "duplicate-node");
        used.add(n.tempId);
        nodes.push(n);
        return n.tempId;
    };
    const defaults = {
        depth: 1,
        impact: 3,
        urgency: 3,
        effortCost: 1,
        successLikelihood: 0.8,
        completionCriteria: null,
        expectedResult: null,
        estimatedMinutes: null,
    };
    const objectiveId = add({
        ...defaults,
        tempId:
            continuity?.nodes.find((n) => n.nodeType === "OBJECTIVE")?.tempId ?? id("objective"),
        nodeType: "OBJECTIVE",
        title: input.normalizedObjective.title,
        description: input.normalizedObjective.desiredOutcome,
        strategyKey: null,
    });
    const partOf = (from: string, to: string) => {
        edges.push({ from, to, edgeType: "PART_OF", hardDependency: false, rationale: null });
    };
    for (const condition of input.conditions) {
        const cid = add({
            ...defaults,
            ...condition,
            tempId: id("condition", condition.key),
            strategyKey: null,
        });
        partOf(cid, objectiveId);
    }
    if (continuity && continuity.strategies.length !== input.strategies.length)
        fail("Replanning must preserve existing strategy identities.", "strategy-selection");
    let bottleneckTempId: string | null = null;
    const strategies = input.strategies.map((s, si) => {
        if (!s.name.trim() || !s.summary.trim() || !s.rationale.trim())
            fail("Strategies require a name, summary and rationale.", "strategy-branch");
        const previous = continuity?.strategies[si];
        const skey = previous?.key ?? "strategy-" + si;
        const ids: string[] = [];
        workIdsByStrategy[si] = ids;
        const dependencies: number[][] = [];
        const workPaths: (string | number)[][] = [];
        for (const [mi, milestone] of s.milestones.entries()) {
            const oldMilestone = continuity?.nodes.find(
                (n) =>
                    n.tempId === milestone.key &&
                    n.nodeType === "MILESTONE" &&
                    n.strategyKey === skey,
            );
            const mid = add({
                ...defaults,
                tempId: oldMilestone?.tempId ?? id(skey, "milestone", milestone.key),
                strategyKey: skey,
                nodeType: "MILESTONE",
                title: milestone.title,
                description: milestone.description,
            });
            partOf(mid, objectiveId);
            for (const [wi, item] of milestone.work.entries()) {
                const content = item.content;
                let current: PlanProposal["nodes"][number];
                if (content.source === "accepted") {
                    const accepted = continuity?.nodes.find((n) => n.tempId === content.tempId);
                    if (
                        !accepted ||
                        accepted.strategyKey !== skey ||
                        !["ACTION", "EXPERIMENT"].includes(accepted.nodeType)
                    )
                        fail(
                            "Accepted work must belong to this strategy and plan.",
                            "progress-preservation",
                        );
                    current = { ...defaults, ...accepted };
                } else {
                    if (
                        continuity?.nodes.some(
                            (n) =>
                                ["DONE", "IN_PROGRESS"].includes(n.status) &&
                                n.nodeType === content.nodeType &&
                                n.title === content.title,
                        )
                    )
                        fail(
                            "Reference accepted work instead of duplicating it.",
                            "progress-preservation",
                        );
                    current = {
                        ...defaults,
                        ...content,
                        tempId: id(skey, milestone.key, item.key),
                        strategyKey: skey,
                    };
                }
                const aid = add(current);
                partOf(aid, mid);
                ids.push(aid);
                dependencies.push(item.prerequisiteIndexes);
                workPaths.push(["strategies", si, "milestones", mi, "work", wi]);
            }
        }
        dependencies.forEach((deps, index) => {
            for (const [di, prerequisite] of deps.entries()) {
                const from = ids[prerequisite];
                if (!from)
                    referenceFailure(
                        "A prerequisite index does not identify declared work",
                        "dangling-edge",
                        [...workPaths[index]!, "prerequisiteIndexes", di],
                        prerequisite,
                    );
                if (prerequisite === index)
                    referenceFailure(
                        "Work cannot depend on itself",
                        "dependency-cycle",
                        [...workPaths[index]!, "prerequisiteIndexes", di],
                        prerequisite,
                    );
                edges.push({
                    from,
                    to: ids[index]!,
                    edgeType: "REQUIRES",
                    hardDependency: true,
                    rationale: null,
                });
            }
        });
        if (input.bottleneck?.strategyIndex === si)
            bottleneckTempId =
                ids[input.bottleneck.workIndex] ??
                referenceFailure(
                    "Bottleneck must identify existing work",
                    "dangling-edge",
                    ["bottleneck", "workIndex"],
                    input.bottleneck.workIndex,
                );
        const { milestones: _milestones, ...details } = s;
        return { ...details, key: skey, name: previous?.name ?? s.name };
    });
    if (input.bottleneck && !bottleneckTempId)
        referenceFailure(
            "Bottleneck strategy does not exist",
            "strategy-selection",
            ["bottleneck", "strategyIndex"],
            input.bottleneck.strategyIndex,
        );
    // Progress is server-owned. Keep verified work even if the model omits it.
    for (const saved of continuity?.nodes ?? []) {
        if (["DONE", "IN_PROGRESS"].includes(saved.status) && !used.has(saved.tempId)) {
            add({ ...defaults, ...saved });
            partOf(saved.tempId, objectiveId);
        }
    }
    for (const edge of continuity?.edges ?? [])
        if (
            edge.hardDependency &&
            used.has(edge.from) &&
            used.has(edge.to) &&
            !edges.some(
                (e) =>
                    e.from === edge.from &&
                    e.to === edge.to &&
                    e.edgeType === edge.edgeType &&
                    e.hardDependency,
            )
        )
            edges.push({ ...edge });
    const assumptions: PlanProposal["assumptions"] = assumptionSlots.map((a, index) => {
        const slot = Object.entries(input.assumptions).filter(([, value]) => value !== null)[
            index
        ]![0];
        const target =
            a.validator === null
                ? null
                : workIdsByStrategy[a.strategy === "FIRST" ? 0 : 1]?.[a.validator.workIndex];
        if (a.validator !== null && !target)
            referenceFailure(
                "An assumption validator must identify existing executable work in its owning strategy.",
                "assumption-validator",
                ["assumptions", slot, "validator", "workIndex"],
                a.validator.workIndex,
            );
        if (a.importance === "HIGH" && !target)
            fail("A HIGH assumption requires an executable validator.", "assumption-validator");
        return {
            statement: a.statement,
            importance: a.importance,
            validationNodeTempId: target ?? null,
        };
    });
    const proposal = planProposalSchema.parse({
        ...input,
        strategies,
        nodes,
        edges,
        assumptions,
        bottleneckTempId,
    });
    validateProposal(proposal, true, continuity);
    return proposal;
}
