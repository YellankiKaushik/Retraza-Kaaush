import { expect, it, vi } from "vitest";
import { previewHeaders, installPreviewAccess } from "../../scripts/preview-access.mjs";

it("sends temporary Preview identity only to the exact independent Retraza HTTPS origin", () => {
    const origin = "https://retraza-kaaush-example.vercel.app";
    expect(previewHeaders(origin + "/auth", origin, "synthetic-token")).toEqual({
        "x-vercel-trusted-oidc-idp-token": "synthetic-token",
    });
    for (const url of [
        "https://accounts.google.com",
        "https://usvopldwiwzlvoqawvcu.supabase.co",
        "https://reversepath-vibesprint.vercel.app",
        "https://retraza-kaaush-other.vercel.app",
    ])
        expect(previewHeaders(url, origin, "synthetic-token")).toEqual({});
    expect(previewHeaders(origin, origin, "")).toEqual({});
    expect(
        previewHeaders(
            "https://reversepath-vibesprint.vercel.app",
            "https://reversepath-vibesprint.vercel.app",
            "synthetic-token",
        ),
    ).toEqual({});
});
it("does not follow redirects while proxying protected requests or disclose raw failures", async () => {
    let handler: (route: unknown) => Promise<void>;
    const page = {
        route: vi.fn(async (_match: unknown, fn: typeof handler) => {
            handler = fn;
        }),
    };
    await installPreviewAccess(
        page,
        "https://retraza-kaaush-example.vercel.app",
        "synthetic-token",
    );
    const fetch = vi.fn(async () => ({ status: 302 }));
    const route = {
        request: () => ({
            headers: () => ({}),
            url: () => "https://retraza-kaaush-example.vercel.app/auth",
        }),
        fetch,
        fulfill: vi.fn(),
    };
    await handler!(route);
    expect(fetch).toHaveBeenCalledWith(expect.objectContaining({ maxRedirects: 0 }));
    fetch.mockRejectedValueOnce(new Error("private request headers"));
    await expect(handler!(route)).rejects.toThrow("diagnostics withheld");
});
