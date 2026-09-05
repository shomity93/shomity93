import { describe, expect, it } from "vitest";
import { calculateDashboardTotals } from "../shared/accounting";
import { validateCooperativeUpload } from "../client/src/lib/cooperativeData";

describe("member-wise dashboard aggregation", () => {
  it("adds member deposits and fines to the fund", () => {
    expect(calculateDashboardTotals([1000], [200], [
      { transaction_type: "deposit", amount: "300" },
      { transaction_type: "fine", amount: 50 },
    ])).toEqual({ totalDeposits: 1350, totalExpenses: 200, currentFund: 1150 });
  });

  it("subtracts member withdrawals and loans from the fund", () => {
    expect(calculateDashboardTotals([1000], [200], [
      { transaction_type: "withdrawal", amount: 150 },
      { transaction_type: "loan", amount: "250" },
    ])).toEqual({ totalDeposits: 1000, totalExpenses: 600, currentFund: 400 });
  });

  it("accepts supported images and PDFs but rejects unsupported or oversized files", () => {
    expect(validateCooperativeUpload({ name: "logo.webp", type: "image/webp", size: 30_000 })).toBe(true);
    expect(validateCooperativeUpload({ name: "receipt.pdf", type: "application/pdf", size: 40_000 })).toBe(true);
    expect(validateCooperativeUpload({ name: "script.exe", type: "application/octet-stream", size: 10_000 })).toBe(false);
    expect(validateCooperativeUpload({ name: "large.jpg", type: "image/jpeg", size: 11 * 1024 * 1024 })).toBe(false);
  });
});
