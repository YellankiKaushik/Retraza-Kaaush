import { describe, expect, it } from "vitest";

import { authErrorMessage } from "../../src/lib/auth-errors";

describe("authentication error guidance", () => {
    it("uses the email limit code even if provider wording changes", () => {
        expect(
            authErrorMessage({ code: "over_email_send_rate_limit", status: 429 }, "signup"),
        ).toContain("Confirmation emails are temporarily rate limited");
    });

    it("keeps request throttling separate from email throttling", () => {
        expect(
            authErrorMessage({ status: 429, code: "over_request_rate_limit" }, "signup"),
        ).toContain("Too many signup attempts");
    });

    it("does not expose private delivery diagnostics", () => {
        const message = authErrorMessage(
            {
                status: 500,
                message: "Error sending confirmation email: private provider diagnostics",
            },
            "signup",
        );
        expect(message).toContain("You must confirm your email");
        expect(message).not.toContain("private provider diagnostics");
    });

    it("does not describe every server failure as an email failure", () => {
        expect(
            authErrorMessage({ status: 500, message: "Database error saving new user" }, "signup"),
        ).toContain("Account creation is temporarily unavailable");
    });

    it("preserves useful sign-in errors and handles unknown failures", () => {
        expect(authErrorMessage(new Error("Invalid login credentials"), "signin")).toBe(
            "Invalid login credentials",
        );
        expect(authErrorMessage(undefined, "signup")).toContain("Please try again");
    });
});
