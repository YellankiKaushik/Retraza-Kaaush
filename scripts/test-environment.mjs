// The immutable reference backend is read-only, even when copied into local .env.
const referenceHost = "usvopldwiwzlvoqawvcu.supabase.co";

export function assertIsolatedTestBackend(env = process.env) {
    const target = env.SUPABASE_TEST_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    let hostname;
    try {
        hostname = new URL(target).hostname.toLowerCase();
    } catch {
        /* Fail closed below. */
    }
    if (env.RETRAZA_TEST_BACKEND_ISOLATED !== "true" || !hostname || hostname === referenceHost)
        throw new Error(
            "TEST_ENVIRONMENT_NOT_ISOLATED: live database tests are blocked. Configure a dedicated Retraza/local backend and RETRAZA_TEST_BACKEND_ISOLATED=true. The shared reference database is strictly read-only.",
        );
    if (
        env.SUPABASE_TEST_URL &&
        env.SUPABASE_TEST_URL !== env.SUPABASE_URL &&
        (!(env.SUPABASE_TEST_PUBLISHABLE_KEY || env.SUPABASE_TEST_ANON_KEY) ||
            !(env.SUPABASE_TEST_SECRET_KEY || env.SUPABASE_TEST_SERVICE_ROLE_KEY))
    )
        throw new Error(
            "A separate test URL requires its own publishable and secret keys; application credentials will not be reused.",
        );
}

export function assertRequestedDatabaseTestsAreSafe(env = process.env) {
    if (
        ["RUN_SUPABASE_RLS_TESTS", "RUN_E2E_GOLDEN", "RUN_E2E_SIGNUP"].some(
            (name) => env[name] === "true",
        )
    )
        assertIsolatedTestBackend(env);
}
