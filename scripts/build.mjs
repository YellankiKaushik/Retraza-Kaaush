import { spawn } from "node:child_process";

const preset = process.argv[2];
if (!["node-server", "vercel"].includes(preset)) {
    throw new Error("Choose node-server or vercel as the production target.");
}
const child = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    stdio: "inherit",
    env: { ...process.env, NITRO_PRESET: preset },
    shell: false,
});
child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
});
child.on("exit", (code) => {
    process.exitCode = code ?? 1;
});
