import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function AppShell({ children }: { children: ReactNode }) {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen blueprint-grid">
            <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                    <Link to="/" className="flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded border border-border-strong bg-secondary font-mono text-xs text-primary">
                            RP
                        </span>
                        <span className="text-sm font-semibold tracking-tight">ReversePath</span>
                    </Link>

                    <nav className="flex items-center gap-1.5">
                        {user ? (
                            <>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link to="/">Plans</Link>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link to="/new">New</Link>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                    <Link to="/settings">Account</Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        await signOut();
                                        navigate({ to: "/auth" });
                                    }}
                                >
                                    Sign out
                                </Button>
                            </>
                        ) : (
                            <Button size="sm" asChild>
                                <Link to="/auth">Sign in</Link>
                            </Button>
                        )}
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

            <footer className="border-t border-border px-4 py-6">
                <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
                    ReversePath produces reasoned plans, not professional advice. For medical, legal, or
                    financial decisions, verify with a qualified professional.
                </p>
            </footer>
        </div>
    );
}
