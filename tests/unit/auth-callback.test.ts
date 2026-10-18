import { describe, expect, it, vi } from "vitest";
import { cleanAuthCallback, isAuthCallback, restoreAuthSession } from "../../src/lib/auth-callback";

describe("OAuth session restoration", () => {
    it("surfaces initialization errors which getSession does not return", async () => {
        const auth = {
            initialize: vi
                .fn()
                .mockResolvedValue({ error: { message: "private provider detail" } }),
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        };
        const result = await restoreAuthSession(auth, true);
        expect(result.error).toContain("Sign-in could not be completed");
        expect(result.error).not.toContain("private provider detail");
    });

    it("waits for callback processing before reading the persisted session", async () => {
        const order: string[] = [];
        const session = { user: { id: "disposable" } };
        const auth = {
            initialize: vi.fn().mockImplementation(async () => {
                order.push("callback");
                return { error: null };
            }),
            getSession: vi.fn().mockImplementation(async () => {
                order.push("session");
                return { data: { session }, error: null };
            }),
        };
        expect(await restoreAuthSession(auth, true)).toEqual({ session, error: null });
        expect(order).toEqual(["callback", "session"]);
    });

    it("distinguishes a missing callback session from an ordinary signed-out visit", async () => {
        const auth = {
            initialize: vi.fn().mockResolvedValue({ error: null }),
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        };
        expect((await restoreAuthSession(auth, true)).error).toContain("Sign-in could not");
        expect((await restoreAuthSession(auth, false)).error).toBeNull();
    });

    it("recognizes and removes callback credentials and errors while preserving other query parameters", () => {
        const url = new URL(
            "https://preview.example/auth?code=withheld&keep=yes#error=access_denied&error_description=withheld&provider_token=withheld",
        );
        expect(isAuthCallback(url)).toBe(true);
        expect(cleanAuthCallback(url)).toBe("/auth?keep=yes");
        expect(isAuthCallback(url)).toBe(false);
    });
});
