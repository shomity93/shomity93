import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMemberStatusEmail } from "./brevo";

describe("Brevo member-status notifications", () => {
  const originalKey = process.env.BREVO_API_KEY;
  const originalSender = process.env.BREVO_SENDER_EMAIL;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalKey;
    if (originalSender === undefined) delete process.env.BREVO_SENDER_EMAIL;
    else process.env.BREVO_SENDER_EMAIL = originalSender;
  });

  it("sends a Bengali approval payload through the Brevo API", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_SENDER_EMAIL = "verified@example.com";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageId: "test" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendMemberStatusEmail({ email: "member@example.com", fullName: "পরীক্ষা সদস্য", status: "approved" });

    expect(result).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toMatchObject({ "api-key": "test-key" });
    expect(String(request.body)).toContain("member@example.com");
    expect(String(request.body)).toContain("সদস্য অনুমোদন সম্পন্ন");
  });

  it("returns a safe configuration result when no verified sender is configured", async () => {
    process.env.BREVO_API_KEY = "test-key";
    delete process.env.BREVO_SENDER_EMAIL;
    const result = await sendMemberStatusEmail({ email: "member@example.com", fullName: "পরীক্ষা সদস্য", status: "approved" });
    expect(result.sent).toBe(false);
  });
});
