export type MemberTransactionAmount = { transaction_type: "deposit" | "withdrawal" | "fine" | "loan"; amount: number | string };

export function calculateDashboardTotals(deposits: Array<number | string>, expenses: Array<number | string>, memberTransactions: MemberTransactionAmount[]) {
  const memberDeposits = memberTransactions.filter((row) => row.transaction_type === "deposit" || row.transaction_type === "fine").reduce<number>((sum, row) => sum + Number(row.amount), 0);
  const memberWithdrawals = memberTransactions.filter((row) => row.transaction_type === "withdrawal" || row.transaction_type === "loan").reduce<number>((sum, row) => sum + Number(row.amount), 0);
  const totalDeposits = deposits.reduce<number>((sum, amount) => sum + Number(amount), 0) + memberDeposits;
  const totalExpenses = expenses.reduce<number>((sum, amount) => sum + Number(amount), 0) + memberWithdrawals;
  return { totalDeposits, totalExpenses, currentFund: totalDeposits - totalExpenses };
}
