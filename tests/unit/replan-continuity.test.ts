import { describe, expect, it, vi } from "vitest";
import {
    buildReplanContext,
    persistProposal,
    validateProposal,
    type PersistArgs,
} from "@/lib/planner.server";
import { replanPrompt } from "@/ai/prompts.server";
import { compactPlan } from "../helpers/compact-plan";
import { replanContext } from "../helpers/replan-context";

describe("strict replan continuity", () => {
    const mutations: Array<[string, (proposal: ReturnType<typeof compactPlan>) => void, string]> = [
        [
            "missing milestone references",
            (p) => {
                p.nodes = p.nodes.filter((n) => n.tempId !== "milestone-review");
            },
            "dangling-edge",
        ],
        [
            "dangling edges",
            (p) => {
                p.edges[0]!.from = "absent";
            },
            "dangling-edge",
        ],
        [
            "cyclic prerequisites",
            (p) => {
                p.edges.push({
                    from: "action-remove-blocker",
                    to: "action-baseline",
                    edgeType: "REQUIRES",
                    hardDependency: true,
                    rationale: null,
                });
            },
            "dependency-cycle",
        ],
        [
            "unknown strategies",
            (p) => {
                p.nodes[0]!.strategyKey = "absent";
            },
            "strategy-selection",
        ],
        [
            "lost strategy selection",
            (p) => {
                p.strategies[0]!.name = "Silently changed strategy";
            },
            "strategy-selection",
        ],
        [
            "insufficient actions",
            (p) => {
                p.nodes.find((n) => n.tempId === "action-extra-3")!.nodeType = "REQUIREMENT";
            },
            "executable-count",
        ],
        [
            "lost completed work",
            (p) => {
                p.nodes.find((n) => n.tempId === "action-baseline")!.title = "Redo completed work";
            },
            "progress-preservation",
        ],
        [
            "changed completion evidence",
            (p) => {
                p.nodes.find((n) => n.tempId === "action-baseline")!.completionCriteria =
                    "A different task";
            },
            "progress-preservation",
        ],
        [
            "orphaned nodes",
            (p) => {
                p.edges = p.edges.filter(
                    (e) => e.from !== "action-extra-3" && e.to !== "action-extra-3",
                );
            },
            "orphan-node",
        ],
        [
            "invalid assumptions",
            (p) => {
                p.assumptions[0]!.validationNodeTempId = "absent";
            },
            "assumption-validator",
        ],
        [
            "blank assumptions",
            (p) => {
                p.assumptions[0]!.statement = " ";
            },
            "assumptions-content",
        ],
        [
            "invalid risks",
            (p) => {
                p.risks[0]!.mitigation = " ";
            },
            "risks-content",
        ],
        [
            "lost retained prerequisites",
            (p) => {
                p.edges.find((e) => e.to === "action-remove-blocker")!.hardDependency = false;
            },
            "prerequisite-preservation",
        ],
    ];
    for (const [name, mutate, validationRule] of mutations)
        it(`rejects ${name} without repairing or mutating accepted state`, () => {
            const proposal = compactPlan();
            const context = replanContext(proposal);
            const before = structuredClone(context);
            mutate(proposal);
            expect(() => validateProposal(proposal, true, context)).toThrowError(
                expect.objectContaining({ code: "PLAN_VALIDATION_FAILED", validationRule }),
            );
            expect(context).toEqual(before);
        });

    it("accepts complex replanning with alternative strategies and verified progress", () => {
        const proposal = compactPlan();
        const context = replanContext(proposal);
        proposal.summary = "Revised capacity-aware sequence; accepted baseline remains complete.";
        expect(() => validateProposal(proposal, true, context)).not.toThrow();
    });

    it("rejects a graph without any executable frontier on the selected route", () => {
        const proposal = compactPlan();
        for (const node of proposal.nodes.filter((n) => n.nodeType === "ACTION"))
            proposal.edges.push({
                from: "requirement-clarity",
                to: node.tempId,
                edgeType: "REQUIRES",
                hardDependency: true,
                rationale: null,
            });
        expect(() => validateProposal(proposal, true)).toThrowError(
            expect.objectContaining({ validationRule: "executable-frontier" }),
        );
    });

    function args() {
        const proposal = compactPlan();
        const rpc = vi.fn(async () => ({
            data: { versionId: "candidate", versionNumber: 2 },
            error: null,
        }));
        return {
            rpc,
            input: {
                supabase: { rpc } as unknown as PersistArgs["supabase"],
                userId: "owner",
                planId: "plan",
                caseId: "case",
                proposal,
                scenario: "BALANCED",
                parentVersionId: "active",
                versionNumber: 2,
                modelAlias: "PRIMARY",
                promptVersion: "test",
                generationSource: { provider: "gemini", model: "fictional" },
                activate: false,
                continuity: replanContext(proposal),
            } satisfies PersistArgs,
        };
    }
    for (const [name, patch] of [
        ["wrong parent", { parentVersionId: "other" }],
        ["wrong plan", { planId: "other" }],
        ["premature activation", { activate: true }],
    ] as const)
        it(`refuses ${name} before any persistence RPC`, async () => {
            const { input, rpc } = args();
            await expect(persistProposal({ ...input, ...patch })).rejects.toMatchObject({
                validationRule: "version-relationship",
            });
            expect(rpc).not.toHaveBeenCalled();
        });
    it("serializes copied completion evidence and selected strategy into a candidate only", async () => {
        const { input, rpc } = args();
        const before = structuredClone(input.continuity);
        await persistProposal(input);
        const call = rpc.mock.calls[0] as unknown as [
            string,
            {
                activate: boolean;
                payload: {
                    plan_nodes: Array<{ id: string; title: string; status: string }>;
                    actions: Array<{
                        plan_node_id: string;
                        completed_at: string | null;
                        result: unknown;
                    }>;
                    strategies: Array<{ name: string; selected: boolean }>;
                };
            },
        ];
        expect(call[1].activate).toBe(false);
        const node = call[1].payload.plan_nodes.find(
            (n) => n.title === before.nodes.find((n) => n.status === "DONE")!.title,
        )!;
        expect(node.status).toBe("DONE");
        expect(call[1].payload.actions.find((a) => a.plan_node_id === node.id)).toMatchObject({
            completed_at: "2026-10-22T06:00:00.000Z",
            result: { note: "Verified baseline evidence" },
        });
        expect(call[1].payload.strategies.find((s) => s.selected)?.name).toBe(
            before.selectedStrategy.name,
        );
        expect(input.continuity).toEqual(before);
    });
    it("fails closed on invalid ACTIVE version ownership before reading progress", () => {
        const input = {
            planId: "plan",
            userId: "owner",
            versionId: "active",
            version: {
                id: "active",
                plan_id: "other",
                user_id: "owner",
                state: "ACTIVE",
                parent_version_id: null,
            },
            nodes: [],
            edges: [],
            strategies: [],
            actions: [],
        } as Parameters<typeof buildReplanContext>[0];
        expect(() => buildReplanContext(input)).toThrowError(
            expect.objectContaining({ validationRule: "version-relationship" }),
        );
    });
    it("includes stable identity, selection, hard edges and progress in the replan prompt", () => {
        const continuity = replanContext(compactPlan());
        const prompt = replanPrompt({
            rawText: "Goal",
            intentType: "GOAL",
            objective: {
                title: "Goal",
                desiredOutcome: "Outcome",
                successCriteria: ["Observable target"],
            },
            facts: [{ category: "RESOURCE", key: "capacity", value: "10 hours" }],
            scenario: "BALANCED",
            previous: "Lossy legacy snapshot",
            reason: "NEW_INFORMATION",
            note: "Fewer hours",
            continuity,
        });
        expect(prompt.prompt).toContain(JSON.stringify(continuity));
        expect(prompt.prompt).not.toContain("Lossy legacy snapshot");
        for (const text of [
            "NEW CANDIDATE",
            "DONE",
            "IN_PROGRESS",
            "EXACT",
            "selected strategy",
            "hard prerequisite",
            "6-12",
            "Acceptance/rejection",
        ])
            expect(prompt.system).toContain(text);
    });
});
