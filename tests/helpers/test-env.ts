import { loadEnv } from "vite";

let loaded = false;

export function loadProjectEnv() {
    if (loaded) return;
    loaded = true;

    const mode = process.env["MODE"] ?? process.env["NODE_ENV"] ?? "test";
    const env = loadEnv(mode, process.cwd(), "");
    for (const [key, value] of Object.entries(env)) {
        if (key.startsWith("SUPABASE_TEST_")) {
            process.env[key] = value;
            continue;
        }
        if (process.env[key] === undefined) process.env[key] = value;
    }
}

export function testPublishableKey() {
    if (!process.env["SUPABASE_TEST_URL"]) {
        return process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    }

    return (
        process.env["SUPABASE_TEST_PUBLISHABLE_KEY"] ??
        process.env["SUPABASE_TEST_ANON_KEY"] ??
        process.env["SUPABASE_PUBLISHABLE_KEY"] ??
        process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]
    );
}

export function testSecretKey() {
    if (!process.env["SUPABASE_TEST_URL"]) {
        return process.env["SUPABASE_SERVICE_ROLE_KEY"];
    }

    return (
        process.env["SUPABASE_TEST_SECRET_KEY"] ??
        process.env["SUPABASE_TEST_SERVICE_ROLE_KEY"] ??
        process.env["SUPABASE_SERVICE_ROLE_KEY"]
    );
}

export function supabaseTestUrl() {
    return process.env["SUPABASE_TEST_URL"] || process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
}

export function hasSupabaseLiveTestCredentials() {
    return Boolean(supabaseTestUrl() && testPublishableKey() && testSecretKey());
}

export function isModernSupabaseApiKey(value: string) {
    return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export function createSupabaseTestFetch(supabaseKey: string): typeof fetch {
    return (input, init) => {
        const headers = new Headers(
            typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );

        if (init?.headers) {
            new Headers(init.headers).forEach((value, key) => headers.set(key, value));
        }

        if (
            isModernSupabaseApiKey(supabaseKey) &&
            headers.get("Authorization") === `Bearer ${supabaseKey}`
        ) {
            headers.delete("Authorization");
        }

        headers.set("apikey", supabaseKey);
        return fetch(input, { ...init, headers });
    };
}
