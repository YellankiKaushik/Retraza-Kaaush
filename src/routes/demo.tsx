import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    DEMO_EDGES,
    DEMO_GOAL,
    DEMO_NODES,
    DEMO_STORAGE_KEY,
    restoreDemoProgress,
} from "@/domain/demo-plan";
import { computeFrontier, progressOf } from "@/domain/frontier";
import type { GraphNode } from "@/domain/types";

export const Route = createFileRoute("/demo")({
    head: () => ({ meta: [{ title: "Prepared offline demo — ReversePath" }] }),
    component: Demo,
});

function Demo() {
    const [state, setState] = useState({ loaded: false, completed: [] as string[] });
    const [ready, setReady] = useState(false);
    useEffect(() => {
        try {
            setState(restoreDemoProgress(localStorage.getItem(DEMO_STORAGE_KEY)));
        } catch {
            toast.error("Browser storage is unavailable. Enable it to save demo progress.");
        }
        setReady(true);
    }, []);

    const nodes: GraphNode[] = DEMO_NODES.map((node) => ({
        ...node,
        status: state.completed.includes(node.id) ? "DONE" : "PENDING",
    }));
    const frontier = computeFrontier(nodes, DEMO_EDGES);
    const next = frontier.ready[0]?.node;
    const progress = progressOf(nodes);

    function save(nextState: typeof state) {
        try {
            localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextState));
            setState(nextState);
        } catch {
            toast.error("Demo progress could not be saved. Check your browser storage settings.");
        }
    }

    return (
        <AppShell>
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="panel border-primary/40 p-4" role="note">
                    <p className="label-mono text-primary">Prepared offline demo · no live AI</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This is a curated example, not an AI response. Completion is saved only in
                        this browser. Sign in to generate your own plans and save them to your
                        workspace.
                    </p>
                </div>
                <header>
                    <p className="label-mono">Your outcome → your next action</p>
                    <h1 className="mt-2 text-3xl font-semibold">A path into product management</h1>
                    <p className="mt-3 text-muted-foreground">{DEMO_GOAL}</p>
                </header>
                {!state.loaded ? (
                    <section className="panel p-6">
                        <h2 className="text-lg font-medium">Explore a prepared six-month plan</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            See the skill gaps, dependencies, recommended next action, and progress
                            tracking.
                        </p>
                        <Button
                            className="mt-4"
                            disabled={!ready}
                            onClick={() => save({ loaded: true, completed: [] })}
                        >
                            Load prepared plan
                        </Button>
                    </section>
                ) : (
                    <>
                        <section className="grid gap-4 sm:grid-cols-3">
                            {[
                                [
                                    "Capacity",
                                    "10 hours / week",
                                    "About 260 hours over six months. Keep your full-time job; review the schedule weekly.",
                                ],
                                [
                                    "Current gap",
                                    "Evidence of PM skills",
                                    "Build proof of user research, prioritization, metrics, and clear product decisions.",
                                ],
                                [
                                    "Strategy",
                                    "Portfolio + feedback",
                                    "Target associate PM or an internal transition. Hiring in six months is an objective, not a guarantee.",
                                ],
                            ].map(([label, value, detail]) => (
                                <article key={label} className="panel p-4">
                                    <p className="label-mono">{label}</p>
                                    <h2 className="mt-2 font-semibold">{value}</h2>
                                    <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
                                </article>
                            ))}
                        </section>
                        <section className="panel border-primary/40 p-6">
                            <p className="label-mono">Recommended next action</p>
                            <h2 className="mt-2 text-xl font-semibold">
                                {next?.title ?? "All example actions completed"}
                            </h2>
                            {next ? (
                                <>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {next.description}
                                    </p>
                                    <p className="mt-3 text-sm">
                                        Done when: {String(next.metadata["completionCriteria"])}
                                    </p>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        ~{String(next.metadata["estimatedMinutes"])} minutes ·
                                        unlocks the next step
                                    </p>
                                    <Button
                                        className="mt-4"
                                        onClick={() =>
                                            save({
                                                loaded: true,
                                                completed: [...state.completed, next.id],
                                            })
                                        }
                                    >
                                        Mark action complete
                                    </Button>
                                </>
                            ) : (
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Review what you learned and update your real plan as
                                    circumstances change.
                                </p>
                            )}
                        </section>
                        <section className="panel p-5" aria-label="Plan progress">
                            <p className="mb-3 text-sm" role="status">
                                {progress.percent}% · {progress.done}/{progress.total} actions
                                complete
                            </p>
                            <Progress value={progress.percent} aria-label="Completed actions" />
                        </section>
                        <section className="space-y-3" aria-label="Execution milestones">
                            {nodes.map((node, index) => (
                                <article key={node.id} className="panel flex gap-4 p-4">
                                    <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-border font-mono text-sm text-primary">
                                        {node.status === "DONE" ? "✓" : index + 1}
                                    </span>
                                    <div>
                                        <p className="label-mono">
                                            {String(node.metadata["phase"])}
                                        </p>
                                        <h3 className="mt-1 font-medium">{node.title}</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {node.status === "DONE"
                                                ? "Complete"
                                                : node.id === next?.id
                                                  ? "Ready to start"
                                                  : `Depends on: ${nodes[index - 1]?.title}`}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </section>
                        <p className="text-sm text-muted-foreground">
                            Risk: limited experience can slow interviews. Seek feedback early;
                            consider an internal move or adjacent role if applications stall.
                        </p>
                    </>
                )}
                <div className="flex flex-wrap gap-3">
                    <Button asChild>
                        <Link to="/auth">Create your own plan</Link>
                    </Button>
                    {state.loaded ? (
                        <Button
                            variant="outline"
                            onClick={() => save({ loaded: false, completed: [] })}
                        >
                            Reset demo
                        </Button>
                    ) : null}
                </div>
            </div>
        </AppShell>
    );
}
