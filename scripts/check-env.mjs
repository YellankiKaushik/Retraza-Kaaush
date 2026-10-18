import { loadEnv } from "vite";

const env = loadEnv("production", process.cwd(), "");
const errors = [];
for (const name of [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
])
    if (!env[name]?.trim()) errors.push(`${name} is missing`);
for (const name of ["VITE_SUPABASE_URL", "SUPABASE_URL"]) {
    try {
        if (!["https:", "http:"].includes(new URL(env[name]).protocol)) throw new Error();
    } catch {
        errors.push(`${name} must be an HTTP(S) URL`);
    }
}
if (env.VITE_SUPABASE_URL !== env.SUPABASE_URL)
    errors.push("Browser and server Supabase URLs must match");
if (env.VITE_SUPABASE_PUBLISHABLE_KEY !== env.SUPABASE_PUBLISHABLE_KEY)
    errors.push("Browser and server publishable keys must match");
function serviceJwt(value) {
    try {
        return JSON.parse(Buffer.from(value.split(".")[1], "base64url")).role === "service_role";
    } catch {
        return false;
    }
}
const privateValues = Object.entries(env)
    .filter(
        ([name, value]) =>
            !name.startsWith("VITE_") &&
            /API_KEY|SERVICE_ROLE|SECRET|PASSWORD|TOKEN/.test(name) &&
            value?.length > 16,
    )
    .map(([, value]) => value);
for (const [name, value] of Object.entries(env))
    if (
        name.startsWith("VITE_") &&
        value &&
        (/API_KEY|SERVICE_ROLE|SECRET|PASSWORD|TOKEN/.test(name) ||
            value.startsWith("sb_secret_") ||
            serviceJwt(value) ||
            privateValues.includes(value))
    )
        errors.push(`${name} exposes a private credential`);
const mode = env.AI_PROVIDER_MODE || "mock";
if (!["mock", "live", "free-first"].includes(mode))
    errors.push("AI_PROVIDER_MODE must be mock, live, or free-first");
if (mode !== "mock") {
    const allowed = (env.AI_PROVIDER_ALLOWLIST || "gemini,groq")
        .split(",")
        .map((name) => name.trim());
    const configured = ["gemini", "groq", "openrouter", "openai", "lovable-ai"].filter((id) => {
        const prefix = id === "lovable-ai" ? "LOVABLE" : id.toUpperCase();
        const enabled = env[id === "lovable-ai" ? "LOVABLE_AI_ENABLED" : `${prefix}_ENABLED`];
        return (
            allowed.includes(id) &&
            enabled !== "false" &&
            env[`${prefix}_API_KEY`] &&
            ["DEFAULT", "FAST", "PRIMARY", "CRITIC", "FALLBACK"].some(
                (role) => env[`${prefix}_MODEL_${role}`],
            )
        );
    });
    if (!configured.length)
        errors.push("Live AI needs an allowed, enabled provider with a key and model");
}
for (const message of errors) console.error(message);
if (errors.length) process.exitCode = 1;
else
    console.log(
        "Environment names and public credential checks passed; remote connectivity is not claimed.",
    );
