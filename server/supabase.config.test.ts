import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("reaches the configured REST endpoint with the publishable key", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(key).toMatch(/^sb_publishable_[A-Za-z0-9_-]+$/);
    const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: key!, Authorization: `Bearer ${key}` } });
    expect([200, 401, 404]).toContain(response.status);
    expect(response.status).not.toBe(500);
  }, 15000);
});
