import { expect, test } from "./fixtures";

test("prepared demo unlocks tasks and persists completion after refresh", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/demo");
    await expect(page.getByText("Prepared offline demo · no live AI")).toBeVisible();
    await page.getByRole("button", { name: "Load prepared plan" }).click();
    await expect(
        page
            .getByRole("heading", {
                name: "Compare three associate PM job descriptions",
                exact: true,
            })
            .first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark action complete" }).click();
    await expect(page.getByText("17% · 1/6 actions complete")).toBeVisible();
    await page.reload();
    await expect(page.getByText("17% · 1/6 actions complete")).toBeVisible();
    await expect(
        page
            .getByRole("heading", {
                name: "Interview three users about one product problem",
                exact: true,
            })
            .first(),
    ).toBeVisible();
    for (let index = 0; index < 5; index++) {
        await page.getByRole("button", { name: "Mark action complete" }).click();
    }
    await expect(page.getByText("100% · 6/6 actions complete")).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "All example actions completed" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reset demo" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Load prepared plan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Load prepared plan" })).toBeEnabled();
    expect(errors).toEqual([]);
});

test("prepared demo stays usable on a narrow mobile screen", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/demo");
    await page.getByRole("button", { name: "Load prepared plan" }).click();
    await page.getByRole("button", { name: "Mark action complete" }).click();
    await expect(page.getByText("17% · 1/6 actions complete")).toBeVisible();
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
});

for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
]) {
    test(`demo fonts, layout and controls render at ${viewport.width}px`, async ({
        page,
    }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto("/demo");
        await page.getByRole("button", { name: "Load prepared plan" }).click();
        await expect(page.getByRole("button", { name: "Mark action complete" })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        expect(await page.evaluate(() => document.fonts.check('16px "Space Grotesk"'))).toBe(true);
        await page.screenshot({ path: testInfo.outputPath("demo.png"), fullPage: true });
    });
}
