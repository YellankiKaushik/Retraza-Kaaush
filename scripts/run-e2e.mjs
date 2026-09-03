import { spawn } from "node:child_process";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

function spawnNode(args, options = {}) {
    return spawn(process.execPath, args, {
        stdio: "inherit",
        shell: false,
        ...options,
    });
}

async function waitForServer(url, timeoutMs = 120_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }
    throw new Error(`Timed out waiting for ${url}`);
}

async function run() {
    const ownsServer = !process.env.PLAYWRIGHT_BASE_URL;
    const server = ownsServer
        ? spawnNode(
              [
                  "./node_modules/vite/bin/vite.js",
                  "dev",
                  "--host",
                  "127.0.0.1",
                  "--port",
                  String(port),
              ],
              {
                  env: {
                      ...process.env,
                      AI_PROVIDER_MODE: process.env.AI_PROVIDER_MODE ?? "mock",
                      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321",
                      VITE_SUPABASE_PUBLISHABLE_KEY:
                          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "test-publishable-key",
                      SUPABASE_URL: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
                      SUPABASE_PUBLISHABLE_KEY:
                          process.env.SUPABASE_PUBLISHABLE_KEY ?? "test-publishable-key",
                  },
              },
          )
        : null;

    try {
        if (server) await waitForServer(baseURL);
        const args = ["./node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)];
        const testProcess = spawnNode(args, {
            env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL },
        });
        const code = await new Promise((resolve) => testProcess.on("exit", resolve));
        process.exitCode = typeof code === "number" ? code : 1;
    } finally {
        if (server && !server.killed) {
            server.kill("SIGINT");
        }
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
