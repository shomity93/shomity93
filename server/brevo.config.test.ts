import { describe, expect, it } from "vitest";

describe("Brevo configuration", () => {
  it("authenticates against the Brevo account endpoint without exposing the key", async () => {
    const apiKey = process.env.BREVO_API_KEY;
    expect(apiKey, "BREVO_API_KEY must be configured").toBeTruthy();
    const response = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": apiKey as string, accept: "application/json" },
    });
    expect(response.ok).toBe(true);
  }, 15000);
});
