import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { createIntake } from "@/lib/intake.functions";

export const Route = createFileRoute("/new")({
    head: () => ({
        meta: [
            { title: "New objective — ReversePath" },
            {
                name: "description",
                content:
                    "Describe a goal, problem or decision in plain language and let ReversePath reverse-engineer it into a dependency-mapped plan.",
            },
            { property: "og:title", content: "New objective — ReversePath" },
            {
                property: "og:description",
                content: "Plain-language intake that turns intent into a typed plan graph.",
            },
        ],
    }),
    component: NewObjective,
});

const EXAMPLES = [
    "I want to move to Berlin next year but I don't know if I can afford it",
    "Our team keeps missing deadlines and I can't tell why",
    "Should I do a masters or take the junior role I was offered?",
    "I want to run a half marathon but I've never run more than 3km",
];

function NewObjective() {
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const submitIntake = useServerFn(createIntake);

    useEffect(() => {
        if (!loading && !user) navigate({ to: "/auth" });
    }, [loading, user, navigate]);

    async function submit() {
        if (text.trim().length < 8) {
            toast.error("Add a little more detail so the plan isn't guesswork.");
            return;
        }
        setBusy(true);
        try {
            const result = await submitIntake({
                data: {
                    text: text.trim(),
                    idempotencyKey: crypto.randomUUID(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    locale: navigator.language,
                },
            });
            const rejected = result as { status?: string; policy?: { reason?: string } };
            if (rejected.status === "REJECTED") {
                toast.error(rejected.policy?.reason || "ReversePath can't plan this request.");
            }
            navigate({ to: "/plans/$caseId", params: { caseId: result.caseId } });
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AppShell>
            <div className="mx-auto max-w-2xl">
                <p className="label-mono">Intake</p>
                <h1 className="mt-2 text-2xl font-semibold">What are you trying to reach?</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Write it the way you'd say it out loud. Vague is fine — ReversePath will ask only the
                    questions that would change the plan.
                </p>

                <div className="panel mt-6 p-5">
                    <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={7}
                        maxLength={10000}
                        placeholder="e.g. I want to switch into product design within a year, but I have a full-time job and no portfolio."
                        className="resize-none border-input bg-background text-base"
                    />
                    <div className="mt-3 flex items-center justify-between">
                        <span className="font-mono text-[11px] text-muted-foreground">
                            {text.length} / 10000
                        </span>
                        <Button onClick={submit} disabled={busy}>
                            {busy ? "Reading your objective…" : "Analyse objective"}
                        </Button>
                    </div>
                </div>

                <div className="mt-6">
                    <p className="label-mono">Try one of these</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {EXAMPLES.map((example) => (
                            <button
                                key={example}
                                type="button"
                                onClick={() => setText(example)}
                                className="rounded-md border border-border bg-secondary/60 px-3 py-1.5 text-left text-xs text-secondary-foreground transition-colors hover:border-border-strong"
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
