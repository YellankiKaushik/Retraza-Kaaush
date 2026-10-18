import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit/handler tests exercise source functions, not TanStack's generated SSR RPCs.
export default defineConfig({
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    test: {
        include: [
            "tests/unit/**/*.test.ts",
            "tests/integration/**/*.test.ts",
            "tests/db/**/*.test.ts",
        ],
        env: { AI_PROVIDER_MODE: "mock" },
    },
});
