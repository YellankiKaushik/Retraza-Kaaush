import { spawnSync } from "node:child_process";

// Local checks only. Live account/inference tests require separate deliberate runs.
const env = {
    ...process.env,
    AI_PROVIDER_MODE: "mock",
    RUN_LIVE_AI_SMOKE: "false",
    RUN_LIVE_DEMO_PLAN: "false",
    RUN_OPENROUTER_PLAN_SMOKE: "false",
    RUN_GROQ_PLAN_CONTRACT: "false",
    RUN_SUPABASE_RLS_TESTS: "false",
    RUN_E2E_GOLDEN: "false",
    RUN_E2E_SIGNUP: "false",
    RETRAZA_TEST_BACKEND_MODE: "read-only",
    RETRAZA_SHARED_TEST_APPROVAL_FILE: "",
    RETRAZA_TEST_RUN_ID: "",
};
for (const args of [
    ["scripts/check-env.mjs"],
    ["node_modules/typescript/bin/tsc", "--noEmit"],
    ["node_modules/eslint/bin/eslint.js", "."],
    ["node_modules/vitest/vitest.mjs", "run", "tests/unit", "tests/integration", "tests/db"],
    ["scripts/build.mjs", "node-server"],
    ["scripts/scan-secrets.mjs"],
    ["scripts/run-e2e.mjs"],
]) {
    console.log("Checking:", args.join(" "));
    const result = spawnSync(process.execPath, args, { env, stdio: "inherit", shell: false });
    if (result.status !== 0 || result.error) {
        process.exitCode = 1;
        break;
    }
}
