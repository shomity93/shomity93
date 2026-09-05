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

import { aggregatePeriodAmounts, reportPeriod } from "../shared/reporting";

describe("report selection helpers", () => {
  it("groups income and expense rows by month or year", () => {
    const rows = [
      { period: reportPeriod("2026-01-03", false), description: "জমা", amount: "100" },
      { period: reportPeriod("2026-01-24", false), description: "জমা", amount: 50 },
      { period: reportPeriod("2026-02-01", false), description: "জমা", amount: 25 },
    ];
    expect(aggregatePeriodAmounts(rows)).toEqual([
      { period: "2026-01", description: "সমষ্টি", amount: 150 },
      { period: "2026-02", description: "সমষ্টি", amount: 25 },
    ]);
    expect(reportPeriod("2026-01-03", true)).toBe("2026");
  });
});

import { groupMemberReportRows } from "../shared/reporting";

describe("separate member-sheet report output", () => {
  it("groups rows into independent member sheets", () => {
    const grouped = groupMemberReportRows([
      { memberName: "আহম্মেদ · M-001", period: "2026-01-01", description: "মাসিক জমা", amount: 100 },
      { memberName: "সালমা · M-002", period: "2026-01-02", description: "ফাইন", amount: 20 },
      { memberName: "আহম্মেদ · M-001", period: "2026-01-03", description: "ধার", amount: 50 },
    ]);
    expect(Object.keys(grouped)).toEqual(["আহম্মেদ · M-001", "সালমা · M-002"]);
    expect(grouped["আহম্মেদ · M-001"]).toHaveLength(2);
    expect(grouped["সালমা · M-002"]).toHaveLength(1);
  });
});
