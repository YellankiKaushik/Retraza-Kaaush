import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase, supabaseConfigurationError } from "@/integrations/supabase/client";
import { cleanAuthCallback, isAuthCallback, restoreAuthSession } from "@/lib/auth-callback";

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const configurationError = supabaseConfigurationError();
        if (configurationError) {
            setError(configurationError);
            setLoading(false);
            return;
        }
        let active = true;
        let restored = false;
        let authEvent = 0;
        const callbackUrl = new URL(window.location.href);
        const callback = isAuthCallback(callbackUrl);
        const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
            if (!active) return;
            authEvent++;
            setSession(next);
            if (next) setError(null);
            if (restored) setLoading(false);
        });

        const initialEvent = authEvent;
        restoreAuthSession(supabase.auth, callback)
            .then(({ session: next, error: sessionError }) => {
                if (!active) return;
                // A sign-in/out event after the read started is newer than its snapshot.
                if (authEvent === initialEvent) setSession(next);
                setError(sessionError);
            })
            .catch(() => {
                if (!active) return;
                setError("Your session could not be restored. Please sign in again.");
            })
            .finally(() => {
                restored = true;
                if (!active) return;
                if (callback) {
                    window.history.replaceState(
                        window.history.state,
                        "",
                        cleanAuthCallback(callbackUrl),
                    );
                }
                setLoading(false);
            });

        return () => {
            active = false;
            subscription.subscription.unsubscribe();
        };
    }, []);

    return {
        session,
        user: session?.user ?? null,
        loading,
        error,
        signOut: () => supabase.auth.signOut(),
    };
}
