import { spawn } from "node:child_process";

const target = new URL(process.argv[2]);
if (target.protocol !== "https:" || target.hostname.startsWith("reversepath-vibesprint"))
    throw new Error("Choose an independent HTTPS Retraza deployment.");
// This command is read-only/public QA, never a shared database acceptance opt-in.
const child = spawn(process.execPath, ["scripts/run-e2e.mjs", ...process.argv.slice(3)], {
    stdio: "inherit",
    shell: false,
    env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: target.origin,
        RETRAZA_TEST_BACKEND_MODE: "read-only",
        RETRAZA_SHARED_TEST_APPROVAL_FILE: "",
        RETRAZA_TEST_RUN_ID: "",
        RUN_E2E_GOLDEN: "false",
        RUN_E2E_SIGNUP: "false",
        RUN_SUPABASE_RLS_TESTS: "false",
        RUN_LIVE_AI_SMOKE: "false",
        RUN_LIVE_DEMO_PLAN: "false",
    },
});
child.on("error", () => {
    console.error("Hosted QA could not start.");
    process.exitCode = 1;
});
child.on("exit", (code) => {
    process.exitCode = code ?? 1;
});
