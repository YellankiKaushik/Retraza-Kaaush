export function previewHeaders(requestUrl, targetOrigin, token) {
    if (!token || !targetOrigin) return {};
    const target = new URL(targetOrigin);
    const request = new URL(requestUrl);
    const isRetraza =
        target.hostname === "retraza-kaaush.vercel.app" ||
        target.hostname.startsWith("retraza-kaaush-");
    if (
        target.protocol !== "https:" ||
        !target.hostname.endsWith(".vercel.app") ||
        !isRetraza ||
        request.origin !== target.origin
    )
        return {};
    return { "x-vercel-trusted-oidc-idp-token": token };
}

export async function installPreviewAccess(
    page,
    targetOrigin,
    token = process.env.VERCEL_OIDC_TOKEN,
) {
    if (!token || !targetOrigin) return;
    await page.route(
        (url) => Object.keys(previewHeaders(url.href, targetOrigin, token)).length > 0,
        async (route) => {
            try {
                // Proxy only this origin. Never forward the credential through redirects.
                const response = await route.fetch({
                    headers: {
                        ...route.request().headers(),
                        ...previewHeaders(route.request().url(), targetOrigin, token),
                    },
                    maxRedirects: 0,
                });
                await route.fulfill({ response });
            } catch {
                throw new Error("Protected Preview request failed; request diagnostics withheld.");
            }
        },
    );
}
