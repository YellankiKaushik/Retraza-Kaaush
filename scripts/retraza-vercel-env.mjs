import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { loadEnv } from "vite";

export const destination = {
    projectId: "prj_IIXn3B3nWc8JqCvPoq6C56En7wze",
    orgId: "team_UYEpjjRaObtrYF55SYu5rqUl",
    scope: "kaushik-yellanki-project",
    name: "retraza-kaaush",
};

export function deploymentVariables(env, providers = ["gemini", "groq"]) {
    if (providers.includes("groq") && env.GROQ_CREDENTIAL_AUTHORIZED !== "true")
        throw new Error(
            "Groq credential ownership and explicit authorization must be established before deployment.",
        );
    if (
        !providers.length ||
        new Set(providers).size !== providers.length ||
        providers.some((provider) => !["gemini", "groq", "openrouter"].includes(provider))
    )
        throw new Error("Choose an explicit supported deployment provider list.");
    const required = [
        "VITE_SUPABASE_URL",
        "VITE_SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        ...providers.map((provider) => `${provider.toUpperCase()}_API_KEY`),
    ];
    for (const name of required)
        if (!env[name]?.trim()) throw new Error(`${name} is required; values are never logged.`);
    if (
        env.SUPABASE_URL !== "https://usvopldwiwzlvoqawvcu.supabase.co" ||
        env.VITE_SUPABASE_URL !== env.SUPABASE_URL ||
        env.VITE_SUPABASE_PUBLISHABLE_KEY !== env.SUPABASE_PUBLISHABLE_KEY
    )
        throw new Error(
            "Deployment must retain the reviewed shared project and matching public configuration.",
        );
    const privateValues = [
        env.SUPABASE_SERVICE_ROLE_KEY,
        env.GEMINI_API_KEY,
        env.GROQ_API_KEY,
        env.OPENROUTER_API_KEY,
    ].filter(Boolean);
    if (
        env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret_") ||
        privateValues.includes(env.VITE_SUPABASE_PUBLISHABLE_KEY)
    )
        throw new Error("A private key cannot be deployed as public configuration.");
    const values = Object.fromEntries(required.map((name) => [name, env[name]]));
    for (const provider of providers.map((provider) => provider.toUpperCase())) {
        if (
            !["DEFAULT", "FAST", "PRIMARY", "CRITIC", "FALLBACK"].some((role) =>
                env[`${provider}_MODEL_${role}`]?.trim(),
            )
        )
            throw new Error(`${provider}_MODEL_DEFAULT or role-specific model is required.`);
        values[`${provider}_ENABLED`] = "true";
        for (const role of ["DEFAULT", "FAST", "PRIMARY", "CRITIC", "FALLBACK"])
            if (env[`${provider}_MODEL_${role}`]?.trim())
                values[`${provider}_MODEL_${role}`] = env[`${provider}_MODEL_${role}`];
    }
    for (const [name, fallback] of Object.entries({
        GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
        GROQ_BASE_URL: "https://api.groq.com/openai/v1",
        OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    })) {
        if (!providers.some((provider) => name.startsWith(provider.toUpperCase() + "_"))) continue;
        if (env[name] && env[name] !== fallback)
            throw new Error(`${name} requires review before forwarding reused credentials.`);
        values[name] = fallback;
    }
    for (const name of [
        "AI_PROVIDER_TIMEOUT_MS",
        "AI_PROVIDER_MAX_RETRIES",
        "AI_MAX_OUTPUT_TOKENS",
        "AI_DAILY_REQUEST_LIMIT",
        "AI_LIMIT_CLASSIFY_AND_CLARIFY_PER_DAY",
        "AI_LIMIT_GENERATE_PLAN_GRAPH_PER_DAY",
        "AI_LIMIT_REPLAN_PER_DAY",
        "SUPABASE_STORAGE_BUCKET",
        "OBJECT_STORAGE_PROVIDER",
    ])
        if (env[name]?.trim()) values[name] = env[name];
    Object.assign(values, {
        AI_PROVIDER_MODE: "live",
        AI_PROVIDER_MAX_RETRIES: "0",
        AI_PROVIDER_ALLOWLIST: providers.join(","),
        AI_ROUTE_FAST:
            providers[0] === "gemini" && providers.includes("groq")
                ? ["groq", ...providers.filter((provider) => provider !== "groq")].join(",")
                : providers.join(","),
        AI_ROUTE_PRIMARY: providers.join(","),
        AI_ROUTE_CRITIC: providers.join(","),
        AI_ROUTE_FALLBACK: providers.join(","),
        ...Object.fromEntries(
            ["gemini", "groq", "openrouter"].map((provider) => [
                `${provider.toUpperCase()}_ENABLED`,
                String(providers.includes(provider)),
            ]),
        ),
        OPENAI_ENABLED: "false",
        LOVABLE_AI_ENABLED: "false",
        RETRAZA_TEST_BACKEND_MODE: "read-only",
        RETRAZA_TEST_BACKEND_ISOLATED: "false",
        RUN_SUPABASE_RLS_TESTS: "false",
        RUN_E2E_GOLDEN: "false",
        RUN_E2E_SIGNUP: "false",
        RUN_LIVE_AI_SMOKE: "false",
        RUN_LIVE_DEMO_PLAN: "false",
    });
    return [
        ...Object.entries(values).map(([key, value]) => ({
            key,
            value,
            target: ["preview", "production"],
            type: /API_KEY$|SERVICE_ROLE_KEY$/.test(key) ? "sensitive" : "plain",
        })),
        ...["preview", "production"].map((target) => ({
            key: "APP_ENV",
            value: target,
            target: [target],
            type: "plain",
        })),
    ];
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/retraza-vercel-env.mjs")) {
    const linked = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
    if (linked.projectId !== destination.projectId || linked.orgId !== destination.orgId)
        throw new Error("Refusing to configure a different Vercel project/team.");
    const env = loadEnv("production", process.cwd(), "");
    const providers = process.argv
        .find((arg) => arg.startsWith("--providers="))
        ?.slice("--providers=".length)
        .split(",") ?? ["gemini", "groq"];
    if (providers.includes("openrouter") && process.argv.includes("--apply")) {
        const proof = JSON.parse(readFileSync("logs/release-openrouter-smoke.json", "utf8"));
        if (
            proof.status !== "PASS" ||
            proof.model !== (env.OPENROUTER_MODEL_PRIMARY || env.OPENROUTER_MODEL_DEFAULT) ||
            Date.now() - Date.parse(proof.checkedAt) > 24 * 3600_000
        )
            throw new Error(
                "OpenRouter deployment requires a fresh successful contract smoke for the configured model.",
            );
    }
    const entries = deploymentVariables(env, providers);
    if (process.argv.includes("--apply")) {
        // Secret values stay in stdin memory, never in process arguments or output.
        const installed = join(process.env.APPDATA, "npm/node_modules/vercel");
        const manifest = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
        const cli = join(installed, manifest.bin.vercel);
        for (const entry of entries) {
            const result = spawnSync(
                process.execPath,
                [
                    cli,
                    "api",
                    `/v10/projects/${destination.projectId}/env?upsert=true`,
                    "--method",
                    "POST",
                    "--input",
                    "-",
                    "--scope",
                    destination.scope,
                    "--raw",
                ],
                {
                    input: JSON.stringify(entry) + "\n",
                    encoding: "utf8",
                    timeout: 90_000,
                    maxBuffer: 4 * 1024 * 1024,
                },
            );
            if (result.status !== 0 || result.error) {
                let diagnostic = String(
                    result.stderr || result.stdout || result.error?.code || "Unknown CLI failure",
                );
                for (const entry of entries)
                    if (entry.value.length > 12)
                        diagnostic = diagnostic.replaceAll(entry.value, "[withheld]");
                throw new Error(
                    `Vercel environment upload failed (exit ${result.status}): ${diagnostic.slice(0, 700)}`,
                );
            }
            const response = JSON.parse(result.stdout);
            if (response.error || response.failed?.length)
                throw new Error(
                    "Vercel rejected environment entries; inspect metadata without printing values.",
                );
            console.log(`Configured ${entry.key} (${entry.target.join(",")}; ${entry.type}).`);
        }
    }
    console.log(
        JSON.stringify({
            project: destination.name,
            applied: process.argv.includes("--apply"),
            entries: entries.map(({ key, type, target }) => ({ key, type, target })),
        }),
    );
}
