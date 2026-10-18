import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const local = new URL(process.argv[2] || "http://127.0.0.1:5174");
if (!["127.0.0.1", "localhost"].includes(local.hostname))
    throw new Error("Destination visual inspection is restricted to localhost.");
const sources = { source: "https://reversepath-vibesprint.vercel.app", destination: local.origin };
const report = [];
mkdirSync("logs/parity-visual", { recursive: true });
const browser = await chromium.launch();
try {
    for (const [name, origin] of Object.entries(sources)) {
        const context = await browser.newContext();
        // Source inspection never sends forms, RPCs, auth requests or database mutations.
        await context.route("**/*", (route) => {
            const request = route.request();
            const url = new URL(request.url());
            if (
                !["GET", "HEAD"].includes(request.method()) ||
                url.pathname.includes("/_serverFn/") ||
                url.hostname.endsWith(".supabase.co")
            )
                return route.abort();
            return route.continue();
        });
        const page = await context.newPage();
        for (const width of [1440, 768, 390]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const [label, path] of [
                ["home", "/"],
                ["auth", "/auth"],
                ["demo", "/demo"],
            ]) {
                await page.goto(origin + path, { waitUntil: "networkidle" });
                if (label === "demo") {
                    await page.getByRole("button", { name: "Load prepared plan" }).click();
                    await page.getByRole("button", { name: "Mark action complete" }).waitFor();
                }
                await page.evaluate(() => document.fonts.ready);
                report.push({
                    name,
                    label,
                    width,
                    ...(await page.evaluate(() => {
                        const heading = document.querySelector("h1");
                        const style = heading ? getComputedStyle(heading) : null;
                        return {
                            heading: heading?.textContent,
                            font: style?.fontFamily,
                            fontSize: style?.fontSize,
                            overflow: document.documentElement.scrollWidth > innerWidth,
                        };
                    })),
                });
                await page.screenshot({
                    path: `logs/parity-visual/${name}-${label}-${width}.png`,
                    fullPage: true,
                });
                if (label === "demo")
                    await page.getByRole("button", { name: "Reset demo" }).click();
            }
        }
        await context.close();
    }
    writeFileSync("logs/parity-visual/report.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    if (report.some((entry) => entry.overflow)) process.exitCode = 1;
} finally {
    await browser.close();
}
