import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { INTENT_TYPE_LABEL, type IntentType } from "@/domain/types";
import { deleteCase, listCases } from "@/lib/data.functions";

export const Route = createFileRoute("/")({
    head: () => ({
        meta: [
            { title: "ReversePath — reverse-engineer any goal into a plan" },
            {
                name: "description",
                content:
                    "Describe any goal, problem or decision. ReversePath maps it backwards into requirements, gaps and dependencies, then ranks the single best next action.",
            },
            { property: "og:title", content: "ReversePath — reverse-engineer any goal into a plan" },
            {
                property: "og:description",
                content:
                    "From vague intent to a dependency graph, honest strategy trade-offs and one concrete next step.",
            },
        ],
    }),
    component: Index,
});

const CAPABILITIES = [
    {
        label: "01 / Intake",
        title: "Any intent, one intake",
        body: "Goals, problems, decisions, habits, uncertainty. Classified, normalised, and clarified with only the questions that would actually change the plan.",
    },
    {
        label: "02 / Reverse map",
        title: "Backwards from the outcome",
        body: "Requirements, resources, constraints and gaps become a typed dependency graph — never a flat checklist.",
    },
    {
        label: "03 / Strategy",
        title: "Materially different options",
        body: "Two to three genuinely different routes with honest trade-offs, risk bands and a recommendation you can override.",
    },
    {
        label: "04 / Frontier",
        title: "The one next action",
        body: "Unblocked actions ranked by impact, urgency, leverage and effort — with the current bottleneck named explicitly.",
    },
];

function Index() {
    const { user, loading } = useAuth();
    const fetchCases = useServerFn(listCases);
    const runDelete = useServerFn(deleteCase);
    const queryClient = useQueryClient();
    const [removing, setRemoving] = useState<string | null>(null);
    const cases = useQuery({
        queryKey: ["cases"],
        queryFn: () => fetchCases(),
        enabled: !!user,
    });

    return (
        <AppShell>
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-32 w-full" />
                </div>
            ) : user ? (
                <section>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="label-mono">Workspace</p>
                            <h1 className="mt-1 text-2xl font-semibold">Your plans</h1>
                        </div>
                        <Button asChild>
                            <Link to="/new">New objective</Link>
                        </Button>
                    </div>

                    {cases.isLoading ? (
                        <div className="mt-6 space-y-3">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : (cases.data ?? []).length === 0 ? (
                        <div className="panel mt-6 p-8 text-center">
                            <h2 className="text-lg font-medium">Nothing mapped yet</h2>
                            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                                Describe a goal, a problem, or a decision in your own words. ReversePath handles the
                                reverse-engineering.
                            </p>
                            <Button className="mt-5" asChild>
                                <Link to="/new">Start your first plan</Link>
                            </Button>
                        </div>
                    ) : (
                        <ul className="mt-6 space-y-3">
                            {(cases.data ?? []).map((item) => (
                                <li
                                    key={item.id}
                                    className="panel p-4 transition-colors hover:border-border-strong"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <Link
                                            to="/plans/$caseId"
                                            params={{ caseId: item.id }}
                                            className="min-w-0 flex-1"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="label-mono">
                                                    {item.intentType
                                                        ? INTENT_TYPE_LABEL[item.intentType as IntentType]
                                                        : "Unclassified"}
                                                </span>
                                                <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                                    {item.status.replace(/_/g, " ")}
                                                </span>
                                                {item.clarityScore !== null ? (
                                                    <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                                        clarity {item.clarityScore}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mt-2 font-medium">{item.title ?? item.rawText.slice(0, 90)}</p>
                                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                                {item.rawText}
                                            </p>
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={removing === item.id}
                                            onClick={async () => {
                                                if (
                                                    !window.confirm("Delete this objective and every plan derived from it?")
                                                )
                                                    return;
                                                setRemoving(item.id);
                                                try {
                                                    await runDelete({ data: { caseId: item.id } });
                                                    toast.success("Objective deleted.");
                                                    await queryClient.invalidateQueries({ queryKey: ["cases"] });
                                                } catch (error) {
                                                    toast.error((error as Error).message);
                                                } finally {
                                                    setRemoving(null);
                                                }
                                            }}
                                        >
                                            {removing === item.id ? "Deleting…" : "Delete"}
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            ) : (
                <>
                    <section className="py-10">
                        <p className="label-mono">Reverse-engineering planner</p>
                        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-5xl">
                            Start at the outcome.
                            <br />
                            <span className="text-primary">Work backwards</span> until one action is obvious.
                        </h1>
                        <p className="mt-5 max-w-xl text-base text-muted-foreground">
                            ReversePath takes any goal, problem or decision, maps what must be true before it can
                            happen, finds the gaps between that and your reality, and hands you the single
                            highest- leverage next step.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Button size="lg" asChild>
                                <Link to="/auth">Map your first objective</Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <a href="#capabilities">How it works</a>
                            </Button>
                        </div>
                    </section>

                    <section id="capabilities" className="grid gap-4 py-8 sm:grid-cols-2">
                        {CAPABILITIES.map((cap) => (
                            <article key={cap.label} className="panel p-5">
                                <p className="label-mono">{cap.label}</p>
                                <h2 className="mt-2 text-lg font-medium">{cap.title}</h2>
                                <p className="mt-2 text-sm text-muted-foreground">{cap.body}</p>
                            </article>
                        ))}
                    </section>
                </>
            )}
        </AppShell>
    );
}
