import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd(), "");
    for (const [name, value] of Object.entries(env)) {
        if (process.env[name] === undefined) process.env[name] = value;
    }
    return {
        plugins: [
            tanstackStart({ server: { entry: "server" } }),
            react(),
            tailwindcss(),
            ...(command === "build"
                ? [nitro({ preset: process.env["NITRO_PRESET"] || "node-server" })]
                : []),
        ],
        resolve: {
            alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
            dedupe: ["react", "react-dom"],
        },
        server: { port: 5173 },
    };
});
