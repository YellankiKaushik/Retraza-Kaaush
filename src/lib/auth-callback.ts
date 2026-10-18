import type { SupabaseClient } from "@supabase/supabase-js";

const callbackKeys = [
    "access_token",
    "refresh_token",
    "provider_token",
    "provider_refresh_token",
    "expires_in",
    "expires_at",
    "token_type",
    "type",
    "code",
    "flow_id",
    "error",
    "error_code",
    "error_description",
];

export function isAuthCallback(url: URL): boolean {
    const hash = new URLSearchParams(url.hash.slice(1));
    return ["access_token", "code", "error", "error_code", "error_description"].some(
        (key) => url.searchParams.has(key) || hash.has(key),
    );
}

export function cleanAuthCallback(url: URL): string {
    const hash = new URLSearchParams(url.hash.slice(1));
    const callbackHash = callbackKeys.some((key) => hash.has(key));
    for (const key of callbackKeys) {
        url.searchParams.delete(key);
        hash.delete(key);
    }
    if (callbackHash) url.hash = hash.toString();
    return url.pathname + url.search + url.hash;
}

/** getSession waits for initialization but does not return URL callback errors. */
export async function restoreAuthSession(
    auth: Pick<SupabaseClient["auth"], "initialize" | "getSession">,
    callback: boolean,
) {
    const initialized = await auth.initialize();
    const { data, error } = await auth.getSession();
    return {
        session: data.session,
        error:
            !data.session && (initialized.error || callback)
                ? "Sign-in could not be completed. Please try again. If this continues, contact support to check the OAuth provider and this site's redirect URL."
                : error
                  ? "Your session could not be restored. Please sign in again."
                  : null,
    };
}
