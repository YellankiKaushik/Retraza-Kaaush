import { spawn } from "node:child_process";

const target = new URL(process.argv[2]);
if (target.protocol !== "https:" || target.hostname.startsWith("reversepath-vibesprint"))
    throw new Error("Choose an independent HTTPS Retraza deployment.");
// Public tests by default. Live gates retain the same isolated-backend checks.
const child = spawn(process.execPath, ["scripts/run-e2e.mjs", ...process.argv.slice(3)], {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, PLAYWRIGHT_BASE_URL: target.origin },
});
child.on("error", () => {
    console.error("Hosted QA could not start.");
    process.exitCode = 1;
});
child.on("exit", (code) => {
    process.exitCode = code ?? 1;
});
