import { describe, expect, it, vi } from "vitest";

vi.mock("./brevo", () => ({
  sendMemberStatusEmailForSupabaseAdmin: vi.fn().mockResolvedValue({ sent: true }),
}));

import { appRouter } from "./routers";
import { sendMemberStatusEmailForSupabaseAdmin } from "./brevo";

describe("notifications.sendMemberStatus", () => {
  it("forwards the secured Supabase Admin token to the server mail helper", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as never,
      res: {} as never,
    });

    const result = await caller.notifications.sendMemberStatus({
      email: "member@example.com",
      fullName: "পরীক্ষা সদস্য",
      status: "approved",
      accessToken: "supabase-admin-session-token",
    });

    expect(result).toEqual({ sent: true });
    expect(sendMemberStatusEmailForSupabaseAdmin).toHaveBeenCalledWith({
      email: "member@example.com",
      fullName: "পরীক্ষা সদস্য",
      status: "approved",
      accessToken: "supabase-admin-session-token",
    });
  });
});
