import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { computeFrontier, progressOf } from "@/domain/frontier";
import type { GraphEdge, GraphNode, NodeType } from "@/domain/types";
import { NODE_TYPE_LABEL } from "@/domain/types";
import { useAuth } from "@/hooks/use-auth";
import { getCaseBundle } from "@/lib/data.functions";
import { editAction, submitCheckIn, updateAction } from "@/lib/execution.functions";
import {
    addContextFact,
    deleteContextFact,
    submitClarification,
    updateObjective,
} from "@/lib/intake.functions";
import {
    activatePlanVersion,
    generatePlan,
    rejectPlanVersion,
    replan,
    selectStrategy,
    updateAssumption,
    updateRisk,
} from "@/lib/planning.functions";

export const Route = createFileRoute("/plans/$caseId")({
    head: () => ({
        meta: [
            { title: "Plan detail — ReversePath" },
            {
                name: "description",
                content:
                    "The dependency graph, strategies, bottleneck and ranked next actions for one objective.",
            },
            { property: "og:title", content: "Plan detail — ReversePath" },
            {
                property: "og:description",
                content: "Track the frontier, bottleneck and version history of a reverse-engineered plan.",
            },
        ],
    }),
    component: PlanDetail,
});

const SCENARIOS = ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"] as const;
type Scenario = (typeof SCENARIOS)[number];

const FACT_CATEGORIES = ["RESOURCE", "CONSTRAINT", "PREFERENCE", "FACT", "MEASURE"] as const;
type FactCategory = (typeof FACT_CATEGORIES)[number];

const MAP_GROUPS: Array<{ label: string; types: NodeType[] }> = [
    { label: "Outcome", types: ["OBJECTIVE", "OUTCOME"] },
    { label: "Requirements", types: ["REQUIREMENT", "METRIC"] },
    { label: "Resources", types: ["RESOURCE"] },
    { label: "Constraints", types: ["CONSTRAINT", "BLOCKER"] },
    { label: "Gaps", types: ["GAP"] },
    { label: "Milestones", types: ["MILESTONE"] },
    { label: "Actions & experiments", types: ["ACTION", "EXPERIMENT"] },
];

function PlanDetail() {
    const { caseId } = Route.useParams();
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const fetchBundle = useServerFn(getCaseBundle);
    const runGenerate = useServerFn(generatePlan);
    const runReplan = useServerFn(replan);
    const runActivate = useServerFn(activatePlanVersion);
    const runReject = useServerFn(rejectPlanVersion);
    const runSelectStrategy = useServerFn(selectStrategy);
    const runUpdateAction = useServerFn(updateAction);
    const runEditAction = useServerFn(editAction);
    const runClarify = useServerFn(submitClarification);
    const runCheckIn = useServerFn(submitCheckIn);
    const runAddFact = useServerFn(addContextFact);
    const runDeleteFact = useServerFn(deleteContextFact);
    const runUpdateObjective = useServerFn(updateObjective);
    const runUpdateAssumption = useServerFn(updateAssumption);
    const runUpdateRisk = useServerFn(updateRisk);

    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [checkInNote, setCheckInNote] = useState("");
    const [rating, setRating] = useState<number | null>(null);
    const [scenario, setScenario] = useState<Scenario>("BALANCED");
    const [viewVersionId, setViewVersionId] = useState<string | null>(null);
    const [editingObjective, setEditingObjective] = useState(false);
    const [objectiveDraft, setObjectiveDraft] = useState({
        title: "",
        desiredOutcome: "",
        successCriteria: "",
        timeHorizon: "",
    });
    const [newFact, setNewFact] = useState<{ category: FactCategory; key: string; answer: string }>({
        category: "FACT",
        key: "",
        answer: "",
    });
    const [changedFact, setChangedFact] = useState<{
        category: FactCategory;
        key: string;
        value: string;
    }>({ category: "FACT", key: "", value: "" });
    const [editingAction, setEditingAction] = useState<string | null>(null);
    const [actionDraft, setActionDraft] = useState({
        title: "",
        description: "",
        completionCriteria: "",
        estimatedMinutes: "",
    });
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!loading && !user) navigate({ to: "/auth" });
    }, [loading, user, navigate]);

    const bundle = useQuery({
        queryKey: ["case", caseId, viewVersionId],
        queryFn: () =>
            fetchBundle({ data: viewVersionId ? { caseId, versionId: viewVersionId } : { caseId } }),
        enabled: !!user,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["case", caseId] });

    async function guarded(label: string, fn: () => Promise<unknown>) {
        setBusy(true);
        try {
            await fn();
            if (label) toast.success(label);
            await invalidate();
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setBusy(false);
        }
    }

    const generate = useMutation({
        mutationFn: () =>
            runGenerate({
                data: {
                    caseId,
                    scenario,
                    strategyPreference: null,
                    idempotencyKey: crypto.randomUUID(),
                },
            }),
        onSuccess: () => {
            toast.success("Plan generated.");
            void invalidate();
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const plan = bundle.data?.plan ?? null;
    const nodes = useMemo(() => (plan?.nodes ?? []) as unknown as GraphNode[], [plan?.nodes]);
    const edges = useMemo(() => (plan?.edges ?? []) as unknown as GraphEdge[], [plan?.edges]);

    const frontier = useMemo(() => computeFrontier(nodes, edges), [nodes, edges]);
    const progress = useMemo(() => progressOf(nodes), [nodes]);
    const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
    const prereqsOf = useMemo(() => {
        const map = new Map<string, GraphNode[]>();
        for (const edge of edges) {
            const source = nodeById.get(edge.from_node_id);
            if (!source) continue;
            const list = map.get(edge.to_node_id) ?? [];
            list.push(source);
            map.set(edge.to_node_id, list);
        }
        return map;
    }, [edges, nodeById]);
    const actionByNode = useMemo(
        () =>
            new Map(
                (plan?.actions ?? []).map((a) => [
                    a.plan_node_id,
                    a as {
                        plan_node_id: string;
                        completion_criteria: string | null;
                        expected_result: string | null;
                        estimated_minutes: number | null;
                        revision: number;
                    },
                ]),
            ),
        [plan?.actions],
    );

    if (loading || !user || bundle.isLoading || (!bundle.data && !bundle.isError)) {
        return (
            <AppShell>
                <div className="space-y-4">
                    <Skeleton className="h-9 w-72" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </AppShell>
        );
    }

    if (bundle.isError) {
        return (
            <AppShell>
                <div className="panel p-6">
                    <h1 className="text-lg font-medium">This plan couldn't be loaded</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{(bundle.error as Error).message}</p>
                    <Button className="mt-4" variant="outline" asChild>
                        <Link to="/">Back to plans</Link>
                    </Button>
                </div>
            </AppShell>
        );
    }

    const data = bundle.data!;
    const intake = data.case;
    const questions = intake.questions;
    const bottleneck = nodes.find((n) => n.id === plan?.version?.bottleneck_node_id) ?? null;
    const viewingCandidate = plan?.version?.state === "CANDIDATE";

    return (
        <AppShell>
            <div className="space-y-8">
                <header>
                    <p className="label-mono">
                        {intake.intentType ?? "Unclassified"} · {intake.status.replace(/_/g, " ")}
                        {intake.clarityScore !== null ? ` · clarity ${intake.clarityScore}` : ""}
                    </p>

                    {editingObjective ? (
                        <div className="panel mt-3 space-y-3 p-4">
                            <Input
                                value={objectiveDraft.title}
                                placeholder="Objective title"
                                onChange={(e) => setObjectiveDraft((d) => ({ ...d, title: e.target.value }))}
                            />
                            <Textarea
                                rows={3}
                                value={objectiveDraft.desiredOutcome}
                                placeholder="Desired outcome"
                                onChange={(e) =>
                                    setObjectiveDraft((d) => ({ ...d, desiredOutcome: e.target.value }))
                                }
                            />
                            <Textarea
                                rows={3}
                                value={objectiveDraft.successCriteria}
                                placeholder="Success criteria, one per line"
                                onChange={(e) =>
                                    setObjectiveDraft((d) => ({ ...d, successCriteria: e.target.value }))
                                }
                            />
                            <Input
                                value={objectiveDraft.timeHorizon}
                                placeholder="Time horizon (optional)"
                                onChange={(e) => setObjectiveDraft((d) => ({ ...d, timeHorizon: e.target.value }))}
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    disabled={busy}
                                    onClick={() =>
                                        guarded("Objective updated.", async () => {
                                            await runUpdateObjective({
                                                data: {
                                                    caseId,
                                                    title: objectiveDraft.title.trim(),
                                                    desiredOutcome: objectiveDraft.desiredOutcome.trim(),
                                                    successCriteria: objectiveDraft.successCriteria
                                                        .split("\n")
                                                        .map((s) => s.trim())
                                                        .filter(Boolean)
                                                        .slice(0, 8),
                                                    timeHorizon: objectiveDraft.timeHorizon.trim() || null,
                                                },
                                            });
                                            setEditingObjective(false);
                                        })
                                    }
                                >
                                    Save objective
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingObjective(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                                <h1 className="text-2xl font-semibold">
                                    {intake.title ?? intake.rawText.slice(0, 80)}
                                </h1>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setObjectiveDraft({
                                            title: intake.title ?? intake.rawText.slice(0, 120),
                                            desiredOutcome: intake.desiredOutcome ?? "",
                                            successCriteria: intake.successCriteria.join("\n"),
                                            timeHorizon: intake.timeHorizon ?? "",
                                        });
                                        setEditingObjective(true);
                                    }}
                                >
                                    Edit objective
                                </Button>
                            </div>
                            {intake.desiredOutcome ? (
                                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                                    {intake.desiredOutcome}
                                </p>
                            ) : null}
                            {intake.successCriteria.length > 0 ? (
                                <ul className="mt-3 flex flex-wrap gap-2">
                                    {intake.successCriteria.map((criterion) => (
                                        <li
                                            key={criterion}
                                            className="rounded border border-border bg-secondary/50 px-2 py-1 text-xs text-secondary-foreground"
                                        >
                                            {criterion}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </>
                    )}
                </header>

                {intake.policyFlags.length > 0 || intake.status === "REJECTED" ? (
                    <section className="panel border-warning/40 p-4">
                        <p className="label-mono">Policy</p>
                        {intake.status === "REJECTED" ? (
                            <p className="mt-2 text-sm">
                                ReversePath will not decompose this objective. Reframe it into a safe adjacent goal,
                                or consult a qualified professional.
                            </p>
                        ) : null}
                        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {intake.policyFlags.map((flag) => (
                                <li key={flag}>{flag}</li>
                            ))}
                        </ul>
                    </section>
                ) : null}

                {questions.length > 0 && intake.status === "NEEDS_CLARIFICATION" ? (
                    <section className="panel p-5">
                        <p className="label-mono">Clarify · only what changes the plan</p>
                        <div className="mt-4 space-y-4">
                            {questions.map((question) => (
                                <div key={question.key} className="space-y-1.5">
                                    <label className="block text-sm font-medium" htmlFor={question.key}>
                                        {question.question}
                                    </label>
                                    <p className="text-xs text-muted-foreground">{question.why}</p>
                                    <Input
                                        id={question.key}
                                        value={answers[question.key] ?? ""}
                                        onChange={(e) =>
                                            setAnswers((prev) => ({ ...prev, [question.key]: e.target.value }))
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                                disabled={busy}
                                onClick={() =>
                                    guarded("Context saved.", () =>
                                        runClarify({
                                            data: {
                                                caseId,
                                                answers: questions.map((q) => ({
                                                    key: q.key,
                                                    question: q.question,
                                                    category: q.category,
                                                    answer: answers[q.key] ?? "",
                                                })),
                                            },
                                        }),
                                    )
                                }
                            >
                                Save answers
                            </Button>
                            <Button
                                variant="ghost"
                                disabled={busy}
                                onClick={() =>
                                    guarded("Planning with explicit assumptions.", () =>
                                        runClarify({ data: { caseId, answers: [] } }),
                                    )
                                }
                            >
                                Skip — plan with assumptions
                            </Button>
                        </div>
                    </section>
                ) : null}

                <section className="panel p-5">
                    <p className="label-mono">Context the planner may treat as true</p>
                    <ul className="mt-3 space-y-2 text-sm">
                        {data.facts.map((fact) => (
                            <li key={fact.id} className="flex flex-wrap items-start justify-between gap-2">
                                <span className="text-muted-foreground">
                                    <span className="font-mono text-[11px] text-foreground">{fact.category}</span>{" "}
                                    {fact.key}: {fact.answer}
                                </span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() =>
                                        guarded("Fact removed.", () => runDeleteFact({ data: { factId: fact.id } }))
                                    }
                                >
                                    Remove
                                </Button>
                            </li>
                        ))}
                        {data.facts.length === 0 ? (
                            <li className="text-muted-foreground">
                                No context recorded yet — anything you add here constrains the next plan.
                            </li>
                        ) : null}
                    </ul>
                    <div className="mt-4 grid gap-2 sm:grid-cols-[130px_1fr_1fr_auto]">
                        <select
                            className="h-9 rounded border border-border bg-secondary/40 px-2 font-mono text-xs"
                            value={newFact.category}
                            onChange={(e) =>
                                setNewFact((f) => ({ ...f, category: e.target.value as FactCategory }))
                            }
                        >
                            {FACT_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                        <Input
                            placeholder="Label (e.g. weekly hours)"
                            value={newFact.key}
                            onChange={(e) => setNewFact((f) => ({ ...f, key: e.target.value }))}
                        />
                        <Input
                            placeholder="Value"
                            value={newFact.answer}
                            onChange={(e) => setNewFact((f) => ({ ...f, answer: e.target.value }))}
                        />
                        <Button
                            variant="outline"
                            disabled={busy || !newFact.key.trim() || !newFact.answer.trim()}
                            onClick={() =>
                                guarded("Context added.", async () => {
                                    await runAddFact({
                                        data: {
                                            caseId,
                                            category: newFact.category,
                                            key: newFact.key.trim(),
                                            answer: newFact.answer.trim(),
                                        },
                                    });
                                    setNewFact({ category: "FACT", key: "", answer: "" });
                                })
                            }
                        >
                            Add
                        </Button>
                    </div>
                </section>

                {!plan ? (
                    <section className="panel p-6 text-center">
                        <h2 className="text-lg font-medium">Ready to reverse-engineer</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                            ReversePath will map requirements and gaps backwards from your outcome, compare
                            strategies, and rank the first action.
                        </p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                            {SCENARIOS.map((option) => (
                                <Button
                                    key={option}
                                    size="sm"
                                    variant={scenario === option ? "secondary" : "outline"}
                                    onClick={() => setScenario(option)}
                                >
                                    {option.toLowerCase()}
                                </Button>
                            ))}
                        </div>
                        <Button
                            className="mt-4"
                            disabled={generate.isPending || intake.status === "REJECTED"}
                            onClick={() => generate.mutate()}
                        >
                            {generate.isPending ? "Mapping the graph…" : "Generate plan"}
                        </Button>
                        {intake.status === "REJECTED" ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                                This objective was rejected by policy, so it cannot be decomposed.
                            </p>
                        ) : null}
                    </section>
                ) : (
                    <>
                        {viewingCandidate ? (
                            <section className="panel border-primary/40 p-4">
                                <p className="label-mono">Reviewing a proposed version</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Version {plan.version?.version_number} is a candidate. Accept it to make it your
                                    active plan, or reject it to keep the current one.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        disabled={busy}
                                        onClick={() =>
                                            guarded("Candidate accepted.", async () => {
                                                await runActivate({
                                                    data: { planId: plan.id, versionId: plan.version!.id },
                                                });
                                                setViewVersionId(null);
                                            })
                                        }
                                    >
                                        Accept this version
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={busy}
                                        onClick={() =>
                                            guarded("Candidate rejected.", async () => {
                                                await runReject({ data: { versionId: plan.version!.id } });
                                                setViewVersionId(null);
                                            })
                                        }
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </section>
                        ) : null}

                        <section className="grid gap-4 sm:grid-cols-3">
                            <Metric label="Feasibility" value={`${plan.version?.feasibility_score ?? "—"}`} />
                            <Metric label="Confidence" value={`${plan.version?.confidence_score ?? "—"}`} />
                            <Metric
                                label="Progress"
                                value={`${progress.percent}% · ${progress.done}/${progress.total}`}
                            />
                        </section>

                        {Array.isArray(plan.version?.confidence_reasons) &&
                            (plan.version.confidence_reasons as string[]).length > 0 ? (
                            <section className="panel p-5">
                                <p className="label-mono">Why this confidence</p>
                                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    {(plan.version.confidence_reasons as string[]).map((reason) => (
                                        <li key={reason}>— {reason}</li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}

                        {plan.version?.summary ? (
                            <section className="panel p-5">
                                <p className="label-mono">Read of the situation</p>
                                <p className="mt-2 text-sm text-muted-foreground">{plan.version.summary}</p>
                            </section>
                        ) : null}

                        <section className="panel border-primary/30 p-5">
                            <p className="label-mono">Current bottleneck</p>
                            <p className="mt-2 font-medium">
                                {bottleneck?.title ?? "No single bottleneck identified"}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {plan.version?.bottleneck_reason ?? "Evidence was insufficient to name one."}
                            </p>
                        </section>

                        <section>
                            <p className="label-mono">Execution frontier · do this next</p>
                            <ul className="mt-3 space-y-3">
                                {frontier.ready.slice(0, 8).map((candidate) => {
                                    const action = actionByNode.get(candidate.node.id);
                                    const isEditing = editingAction === candidate.node.id;
                                    return (
                                        <li key={candidate.node.id} className="panel p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="label-mono">
                                                    {NODE_TYPE_LABEL[candidate.node.node_type]}
                                                </span>
                                                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-primary">
                                                    score {candidate.score}
                                                </span>
                                                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                                    {candidate.node.status}
                                                </span>
                                            </div>

                                            {isEditing ? (
                                                <div className="mt-3 space-y-2">
                                                    <Input
                                                        value={actionDraft.title}
                                                        onChange={(e) =>
                                                            setActionDraft((d) => ({ ...d, title: e.target.value }))
                                                        }
                                                    />
                                                    <Textarea
                                                        rows={2}
                                                        value={actionDraft.description}
                                                        onChange={(e) =>
                                                            setActionDraft((d) => ({ ...d, description: e.target.value }))
                                                        }
                                                    />
                                                    <Input
                                                        placeholder="Completion criteria"
                                                        value={actionDraft.completionCriteria}
                                                        onChange={(e) =>
                                                            setActionDraft((d) => ({ ...d, completionCriteria: e.target.value }))
                                                        }
                                                    />
                                                    <Input
                                                        placeholder="Estimated minutes"
                                                        inputMode="numeric"
                                                        value={actionDraft.estimatedMinutes}
                                                        onChange={(e) =>
                                                            setActionDraft((d) => ({ ...d, estimatedMinutes: e.target.value }))
                                                        }
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                guarded("Action updated.", async () => {
                                                                    const minutes = Number.parseInt(actionDraft.estimatedMinutes, 10);
                                                                    await runEditAction({
                                                                        data: {
                                                                            nodeId: candidate.node.id,
                                                                            title: actionDraft.title.trim(),
                                                                            description: actionDraft.description.trim(),
                                                                            completionCriteria: actionDraft.completionCriteria.trim(),
                                                                            estimatedMinutes: Number.isFinite(minutes) ? minutes : null,
                                                                        },
                                                                    });
                                                                    setEditingAction(null);
                                                                })
                                                            }
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingAction(null)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="mt-2 font-medium">{candidate.node.title}</p>
                                                    {candidate.node.description ? (
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {candidate.node.description}
                                                        </p>
                                                    ) : null}
                                                    {action?.completion_criteria ? (
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            Done when: {action.completion_criteria}
                                                            {action.estimated_minutes
                                                                ? ` · ~${action.estimated_minutes} min`
                                                                : ""}
                                                        </p>
                                                    ) : null}
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {candidate.reasons.join(" · ")}
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {(
                                                            ["DONE", "IN_PROGRESS", "BLOCKED", "SKIPPED", "DEFERRED"] as const
                                                        ).map((status) => (
                                                            <Button
                                                                key={status}
                                                                size="sm"
                                                                variant={status === "DONE" ? "default" : "outline"}
                                                                disabled={busy}
                                                                onClick={() =>
                                                                    guarded("", () =>
                                                                        runUpdateAction({
                                                                            data: { nodeId: candidate.node.id, status },
                                                                        }),
                                                                    )
                                                                }
                                                            >
                                                                {status.replace("_", " ").toLowerCase()}
                                                            </Button>
                                                        ))}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setActionDraft({
                                                                    title: candidate.node.title,
                                                                    description: candidate.node.description ?? "",
                                                                    completionCriteria: action?.completion_criteria ?? "",
                                                                    estimatedMinutes: action?.estimated_minutes
                                                                        ? String(action.estimated_minutes)
                                                                        : "",
                                                                });
                                                                setEditingAction(candidate.node.id);
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </li>
                                    );
                                })}
                                {frontier.ready.length === 0 ? (
                                    <li className="panel p-4 text-sm text-muted-foreground">
                                        Nothing is unblocked right now — clear a blocked item below or check in to
                                        replan.
                                    </li>
                                ) : null}
                            </ul>
                        </section>

                        {frontier.blocked.length > 0 ? (
                            <section>
                                <p className="label-mono">Blocked</p>
                                <ul className="mt-3 space-y-2">
                                    {frontier.blocked.map((candidate) => (
                                        <li key={candidate.node.id} className="panel p-4">
                                            <p className="font-medium">{candidate.node.title}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Waiting on:{" "}
                                                {candidate.blockedBy.map((b) => b.title).join(", ") || "a blocked status"}
                                            </p>
                                            <Button
                                                className="mt-2"
                                                size="sm"
                                                variant="outline"
                                                disabled={busy}
                                                onClick={() =>
                                                    guarded("", () =>
                                                        runUpdateAction({
                                                            data: { nodeId: candidate.node.id, status: "PENDING" },
                                                        }),
                                                    )
                                                }
                                            >
                                                Clear blocked status
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}

                        <section>
                            <p className="label-mono">Reverse map · requirements, gaps and dependencies</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {MAP_GROUPS.map((group) => {
                                    const groupNodes = nodes.filter((n) => group.types.includes(n.node_type));
                                    if (groupNodes.length === 0) return null;
                                    return (
                                        <article key={group.label} className="panel p-4">
                                            <p className="label-mono">{group.label}</p>
                                            <ul className="mt-2 space-y-2 text-sm">
                                                {groupNodes.map((node) => {
                                                    const prereqs = prereqsOf.get(node.id) ?? [];
                                                    return (
                                                        <li key={node.id}>
                                                            <span className="font-medium">{node.title}</span>{" "}
                                                            <span className="font-mono text-[11px] text-muted-foreground">
                                                                {node.status}
                                                            </span>
                                                            {prereqs.length > 0 ? (
                                                                <p className="text-xs text-muted-foreground">
                                                                    depends on: {prereqs.map((p) => p.title).join(", ")}
                                                                </p>
                                                            ) : null}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <p className="label-mono">Strategies</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {plan.strategies.map((strategy) => (
                                    <article
                                        key={strategy.id}
                                        className={`panel p-4 ${strategy.selected ? "border-primary/50" : ""}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="font-medium">{strategy.name}</h3>
                                            <span className="label-mono">{strategy.risk_level} risk</span>
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground">{strategy.summary}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">{strategy.rationale}</p>
                                        {Array.isArray(strategy.tradeoffs) ? (
                                            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                                {(strategy.tradeoffs as string[]).map((tradeoff) => (
                                                    <li key={tradeoff}>— {tradeoff}</li>
                                                ))}
                                            </ul>
                                        ) : null}
                                        <Button
                                            className="mt-3"
                                            size="sm"
                                            variant={strategy.selected ? "secondary" : "outline"}
                                            disabled={strategy.selected || busy}
                                            onClick={() =>
                                                guarded("Strategy selected.", () =>
                                                    runSelectStrategy({
                                                        data: {
                                                            versionId: strategy.plan_version_id,
                                                            strategyId: strategy.id,
                                                        },
                                                    }),
                                                )
                                            }
                                        >
                                            {strategy.selected ? "Selected" : "Choose this route"}
                                        </Button>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className="grid gap-4 sm:grid-cols-2">
                            <div className="panel p-5">
                                <p className="label-mono">Assumptions</p>
                                <ul className="mt-2 space-y-3 text-sm">
                                    {plan.assumptions.map((assumption) => (
                                        <li key={assumption.id}>
                                            <p className="text-muted-foreground">
                                                <span className="font-mono text-[11px] text-foreground">
                                                    {assumption.importance} · {assumption.status}
                                                </span>{" "}
                                                {assumption.statement}
                                            </p>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                {(["VALIDATED", "INVALIDATED", "ACCEPTED"] as const).map((status) => (
                                                    <Button
                                                        key={status}
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={busy || assumption.status === status}
                                                        onClick={() =>
                                                            guarded("", () =>
                                                                runUpdateAssumption({
                                                                    data: { assumptionId: assumption.id, status },
                                                                }),
                                                            )
                                                        }
                                                    >
                                                        {status.toLowerCase()}
                                                    </Button>
                                                ))}
                                            </div>
                                        </li>
                                    ))}
                                    {plan.assumptions.length === 0 ? (
                                        <li className="text-muted-foreground">None recorded.</li>
                                    ) : null}
                                </ul>
                            </div>
                            <div className="panel p-5">
                                <p className="label-mono">Risks &amp; premortem</p>
                                <ul className="mt-2 space-y-3 text-sm">
                                    {plan.risks.map((risk) => (
                                        <li key={risk.id}>
                                            <p className="text-muted-foreground">
                                                <span className="font-mono text-[11px] text-foreground">
                                                    P{risk.probability_band[0]}/I{risk.impact_band[0]} · {risk.status}
                                                </span>{" "}
                                                {risk.statement}
                                                {risk.mitigation ? (
                                                    <span className="block text-xs">Mitigation: {risk.mitigation}</span>
                                                ) : null}
                                            </p>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                {(["MITIGATED", "ACCEPTED", "OCCURRED", "CLOSED"] as const).map(
                                                    (status) => (
                                                        <Button
                                                            key={status}
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={busy || risk.status === status}
                                                            onClick={() =>
                                                                guarded("", () =>
                                                                    runUpdateRisk({ data: { riskId: risk.id, status } }),
                                                                )
                                                            }
                                                        >
                                                            {status.toLowerCase()}
                                                        </Button>
                                                    ),
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                    {plan.risks.length === 0 ? (
                                        <li className="text-muted-foreground">None recorded.</li>
                                    ) : null}
                                </ul>
                            </div>
                        </section>

                        <section className="panel p-5">
                            <p className="label-mono">Check in · reality changed?</p>
                            <Textarea
                                className="mt-3 resize-none"
                                rows={3}
                                value={checkInNote}
                                placeholder="What moved, what stalled, what changed since last time?"
                                onChange={(e) => setCheckInNote(e.target.value)}
                            />
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="label-mono">Progress</span>
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <Button
                                        key={value}
                                        size="sm"
                                        variant={rating === value ? "secondary" : "outline"}
                                        onClick={() => setRating(value)}
                                    >
                                        {value}
                                    </Button>
                                ))}
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-[130px_1fr_1fr]">
                                <select
                                    className="h-9 rounded border border-border bg-secondary/40 px-2 font-mono text-xs"
                                    value={changedFact.category}
                                    onChange={(e) =>
                                        setChangedFact((f) => ({ ...f, category: e.target.value as FactCategory }))
                                    }
                                >
                                    {FACT_CATEGORIES.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                                <Input
                                    placeholder="What changed (label)"
                                    value={changedFact.key}
                                    onChange={(e) => setChangedFact((f) => ({ ...f, key: e.target.value }))}
                                />
                                <Input
                                    placeholder="New value"
                                    value={changedFact.value}
                                    onChange={(e) => setChangedFact((f) => ({ ...f, value: e.target.value }))}
                                />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() =>
                                        guarded("Check-in saved.", async () => {
                                            const changed =
                                                changedFact.key.trim() && changedFact.value.trim()
                                                    ? [
                                                        {
                                                            category: changedFact.category,
                                                            key: changedFact.key.trim(),
                                                            value: changedFact.value.trim(),
                                                        },
                                                    ]
                                                    : [];
                                            const result = await runCheckIn({
                                                data: {
                                                    planId: plan.id,
                                                    note: checkInNote,
                                                    progressRating: rating,
                                                    changedFacts: changed,
                                                },
                                            });
                                            setCheckInNote("");
                                            setRating(null);
                                            setChangedFact({ category: "FACT", key: "", value: "" });
                                            if (result.suggestsReplan) {
                                                toast.message("Circumstances shifted — a replan is worth proposing.");
                                            }
                                        })
                                    }
                                >
                                    Save check-in
                                </Button>
                                <Button
                                    disabled={busy}
                                    onClick={() =>
                                        guarded("A revised version is ready to review.", async () => {
                                            const changed =
                                                changedFact.key.trim() && changedFact.value.trim()
                                                    ? [
                                                        {
                                                            category: changedFact.category,
                                                            key: changedFact.key.trim(),
                                                            value: changedFact.value.trim(),
                                                        },
                                                    ]
                                                    : [];
                                            const result = await runReplan({
                                                data: {
                                                    planId: plan.id,
                                                    reason: "CIRCUMSTANCE_CHANGED",
                                                    note: checkInNote,
                                                    changedFacts: changed,
                                                    idempotencyKey: crypto.randomUUID(),
                                                },
                                            });
                                            setChangedFact({ category: "FACT", key: "", value: "" });
                                            const candidateId = (result as { versionId?: string }).versionId;
                                            if (candidateId) setViewVersionId(candidateId);
                                        })
                                    }
                                >
                                    Propose a revised plan
                                </Button>
                            </div>

                            {plan.checkIns.length > 0 ? (
                                <ul className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                                    {plan.checkIns.map((entry) => (
                                        <li key={entry.id}>
                                            <span className="font-mono text-foreground">
                                                {new Date(entry.created_at).toLocaleDateString()}
                                                {entry.progress_rating ? ` · ${entry.progress_rating}/5` : ""}
                                            </span>{" "}
                                            {entry.note || "(no note)"}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </section>

                        <section>
                            <p className="label-mono">Versions</p>
                            <ul className="mt-3 space-y-2">
                                {plan.versions.map((version) => (
                                    <li
                                        key={version.id}
                                        className="panel flex flex-wrap items-center justify-between gap-3 p-3"
                                    >
                                        <span className="text-sm">
                                            v{version.version_number} · {version.state} · {version.scenario}
                                            {version.feasibility_score !== null
                                                ? ` · feasibility ${version.feasibility_score}`
                                                : ""}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={plan.version?.id === version.id}
                                                onClick={() => setViewVersionId(version.id)}
                                            >
                                                {plan.version?.id === version.id ? "Viewing" : "View"}
                                            </Button>
                                            {version.state === "CANDIDATE" ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            guarded(
                                                                `Version ${version.version_number} is now active.`,
                                                                async () => {
                                                                    await runActivate({
                                                                        data: { planId: plan.id, versionId: version.id },
                                                                    });
                                                                    setViewVersionId(null);
                                                                },
                                                            )
                                                        }
                                                    >
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            guarded("Candidate rejected.", async () => {
                                                                await runReject({ data: { versionId: version.id } });
                                                                setViewVersionId(null);
                                                            })
                                                        }
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="panel mt-3 p-4">
                                <p className="label-mono">What changed in this version</p>
                                {plan.changes.length > 0 ? (
                                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                        {plan.changes.map((change) => (
                                            <li key={change.id}>
                                                <span className="font-mono text-foreground">
                                                    [{change.change_type}] {change.entity_type}
                                                </span>{" "}
                                                {change.before_summary ? `${change.before_summary} → ` : ""}
                                                {change.after_summary ?? ""}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        This is the first version of the plan, so there is nothing to compare it against
                                        yet.
                                    </p>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </AppShell>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="panel p-4">
            <p className="label-mono">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
    );
}
