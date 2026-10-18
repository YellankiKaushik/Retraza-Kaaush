import { chromium } from "@playwright/test";
import { loadEnv } from "vite";

const target = new URL(process.argv[2]);
if (
    !["http:", "https:"].includes(target.protocol) ||
    target.hostname.startsWith("reversepath-vibesprint")
)
    throw new Error(
        "Choose a Retraza deployment or localhost, never the read-only reference deployment.",
    );
const env = loadEnv("test", process.cwd(), "");
const privateValues = Object.entries(env)
    .filter(
        ([name, value]) =>
            !name.startsWith("VITE_") &&
            /API_KEY|SERVICE_ROLE|SECRET|TOKEN/.test(name) &&
            value.length > 16,
    )
    .map(([, value]) => value);
const report = { assets: 0, secretFindings: 0, pageErrors: 0, failedResponses: 0 };
const browser = await chromium.launch();
try {
    const page = await browser.newPage();
    const pending = [];
    page.on("pageerror", () => report.pageErrors++);
    page.on("response", (response) => {
        if (new URL(response.url()).origin !== target.origin) return;
        if (!response.ok()) report.failedResponses++;
        if (/javascript|text\/html/.test(response.headers()["content-type"] ?? ""))
            pending.push(
                response
                    .text()
                    .then((body) => {
                        report.assets++;
                        if (
                            privateValues.some((value) => body.includes(value)) ||
                            /sb_secret_[A-Za-z0-9_-]{20,}|sk-(?:proj-)?[A-Za-z0-9_-]{32,}/.test(
                                body,
                            )
                        )
                            report.secretFindings++;
                    })
                    .catch(() => report.failedResponses++),
            );
    });
    for (const route of ["/", "/auth", "/demo"]) {
        await page.goto(new URL(route, target.origin).href);
        await page.waitForLoadState("networkidle");
    }
    await Promise.all(pending);
    console.log(JSON.stringify(report));
    if (report.secretFindings || report.pageErrors || report.failedResponses) process.exitCode = 1;
} finally {
    await browser.close();
}
