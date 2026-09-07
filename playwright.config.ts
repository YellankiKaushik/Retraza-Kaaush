import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";

const env = loadEnv(process.env["MODE"] ?? process.env["NODE_ENV"] ?? "test", process.cwd(), "");
for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
}

const port = Number(process.env["PLAYWRIGHT_PORT"] ?? 4173);
const baseURL = process.env["PLAYWRIGHT_BASE_URL"] ?? `http://127.0.0.1:${port}`;

export default defineConfig({
    testDir: "./tests/e2e",
    timeout: 30_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    retries: process.env["CI"] ? 1 : 0,
    reporter: "list",
    use: {
        baseURL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
