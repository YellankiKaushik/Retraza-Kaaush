import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
    head: () => ({
        meta: [
            { title: "Sign in — ReversePath planning workspace" },
            {
                name: "description",
                content:
                    "Sign in to ReversePath to turn a goal into a dependency-mapped plan with a ranked next action.",
            },
            { property: "og:title", content: "Sign in — ReversePath" },
            {
                property: "og:description",
                content: "Access your reverse-engineered plans, strategies and execution frontier.",
            },
        ],
    }),
    component: AuthPage,
});

function AuthPage() {
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const { session, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && session) navigate({ to: "/" });
    }, [loading, session, navigate]);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        try {
            if (mode === "signup") {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: window.location.origin },
                });
                if (error) throw error;
                toast.success("Account created. You're signed in.");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
            navigate({ to: "/" });
        } catch (error) {
            toast.error((error as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function google() {
        const result = await lovable.auth.signInWithOAuth("google", {
            redirect_uri: window.location.origin,
        });
        if (result.error) {
            toast.error(result.error.message ?? "Google sign-in failed.");
            return;
        }
        if (result.redirected) return;
        navigate({ to: "/" });
    }

    return (
        <AppShell>
            <div className="mx-auto max-w-md py-8">
                <p className="label-mono">Access</p>
                <h1 className="mt-2 text-2xl font-semibold">
                    {mode === "signin" ? "Sign in to ReversePath" : "Create your workspace"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Your plans, context facts and execution history are private to your account.
                </p>

                <div className="panel mt-6 p-5">
                    <Button variant="outline" className="w-full" onClick={google}>
                        Continue with Google
                    </Button>

                    <div className="my-5 flex items-center gap-3">
                        <span className="h-px flex-1 bg-border" />
                        <span className="label-mono">or email</span>
                        <span className="h-px flex-1 bg-border" />
                    </div>

                    <form className="space-y-4" onSubmit={submit}>
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                minLength={8}
                                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={busy}>
                            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
                        </Button>
                    </form>

                    <button
                        type="button"
                        className="mt-4 w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
                        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                    >
                        {mode === "signin" ? "No account yet? Create one" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </AppShell>
    );
}
