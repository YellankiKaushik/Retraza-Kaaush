import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { exportUserData } from "@/lib/data.functions";

export const Route = createFileRoute("/settings")({
    head: () => ({
        meta: [
            { title: "Account & data — ReversePath" },
            {
                name: "description",
                content:
                    "Manage your ReversePath account, export every objective, plan version and action you own, and sign out.",
            },
            { property: "og:title", content: "Account & data — ReversePath" },
            {
                property: "og:description",
                content: "Export your ReversePath data or sign out of your account.",
            },
        ],
    }),
    component: Settings,
});

function Settings() {
    const { user, loading, signOut } = useAuth();
    const navigate = useNavigate();
    const runExport = useServerFn(exportUserData);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (!loading && !user) navigate({ to: "/auth" });
    }, [loading, user, navigate]);

    return (
        <AppShell>
            <div className="max-w-2xl space-y-6">
                <header>
                    <p className="label-mono">Account</p>
                    <h1 className="mt-2 text-2xl font-semibold">Account &amp; data</h1>
                </header>

                <section className="panel p-5">
                    <p className="label-mono">Signed in as</p>
                    <p className="mt-2 font-mono text-sm">{user?.email ?? "—"}</p>
                </section>

                <section className="panel p-5">
                    <p className="label-mono">Data export</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Download every objective, context fact, plan version, node, edge, action, assumption,
                        risk and check-in stored against your account as JSON.
                    </p>
                    <Button
                        className="mt-4"
                        variant="outline"
                        disabled={exporting}
                        onClick={async () => {
                            setExporting(true);
                            try {
                                const payload = await runExport();
                                const blob = new Blob([JSON.stringify(payload, null, 2)], {
                                    type: "application/json",
                                });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `reversepath-export-${new Date().toISOString().slice(0, 10)}.json`;
                                link.click();
                                URL.revokeObjectURL(url);
                                toast.success("Export downloaded.");
                            } catch (error) {
                                toast.error((error as Error).message);
                            } finally {
                                setExporting(false);
                            }
                        }}
                    >
                        {exporting ? "Preparing export…" : "Export my data"}
                    </Button>
                </section>

                <section className="panel p-5">
                    <p className="label-mono">Session</p>
                    <Button
                        className="mt-4"
                        variant="outline"
                        onClick={async () => {
                            await signOut();
                            navigate({ to: "/auth" });
                        }}
                    >
                        Sign out
                    </Button>
                </section>
            </div>
        </AppShell>
    );
}
