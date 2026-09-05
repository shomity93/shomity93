import { describe, expect, it } from "vitest";
import { can } from "../shared/permissions";

describe("cooperative permissions", () => {
  it("keeps ledger viewing open to every signed-in role", () => {
    expect(can("admin", "view")).toBe(true);
    expect(can("moderator", "view")).toBe(true);
    expect(can("member", "view")).toBe(true);
  });

  it("allows moderators to create and edit but never delete", () => {
    expect(can("moderator", "create")).toBe(true);
    expect(can("moderator", "edit")).toBe(true);
    expect(can("moderator", "delete")).toBe(false);
    expect(can("moderator", "manageSettings")).toBe(false);
  });

  it("keeps members read-only and gives admins full control", () => {
    expect(can("member", "create")).toBe(false);
    expect(can("member", "edit")).toBe(false);
    expect(can("member", "delete")).toBe(false);
    expect(can("admin", "delete")).toBe(true);
    expect(can("admin", "manageMembers")).toBe(true);
  });

  it("applies the same role contract to member-wise deposit, withdrawal, fine, and loan sheets", () => {
    expect(can("moderator", "create")).toBe(true);
    expect(can("moderator", "edit")).toBe(true);
    expect(can("moderator", "delete")).toBe(false);
    expect(can("member", "create")).toBe(false);
    expect(can("admin", "create")).toBe(true);
    expect(can("admin", "delete")).toBe(true);
  });
});
