export type PeriodAmountRow = { period: string; description: string; amount: number | string };

export function aggregatePeriodAmounts(rows: PeriodAmountRow[]) {
  return Object.values(rows.reduce<Record<string, { period: string; description: string; amount: number }>>((accumulator, row) => {
    const current = accumulator[row.period] ?? { period: row.period, description: "সমষ্টি", amount: 0 };
    current.amount += Number(row.amount);
    accumulator[row.period] = current;
    return accumulator;
  }, {})).sort((a, b) => a.period.localeCompare(b.period));
}

export function reportPeriod(date: string, annual: boolean) {
  return date.slice(0, annual ? 4 : 7);
}

export type MemberReportRow = { period: string; description: string; amount: number; type?: string; memberName?: string };

export function groupMemberReportRows(rows: MemberReportRow[]) {
  return rows.reduce<Record<string, MemberReportRow[]>>((accumulator, row) => {
    const key = row.memberName ?? "অজ্ঞাত সদস্য";
    (accumulator[key] ??= []).push(row);
    return accumulator;
  }, {});
}
