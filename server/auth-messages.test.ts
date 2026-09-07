import { describe, expect, it } from "vitest";
import { readableAuthError } from "../shared/auth-messages";

describe("readableAuthError", () => {
  it("turns Supabase permission errors into Bengali guidance", () => {
    expect(readableAuthError({ message: "new row violates row-level security policy" })).toContain("Supabase");
  });

  it("handles confirmation and duplicate-account states", () => {
    expect(readableAuthError(new Error("Email not confirmed"))).toContain("confirmation");
    expect(readableAuthError("User already registered")).toContain("আগে থেকেই");
  });

  it("never returns object-object for structured errors", () => {
    expect(readableAuthError({ message: "", details: "", code: "" })).not.toBe("[object Object]");
  });
});
