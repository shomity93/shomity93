-- Receipt uploads are optional for ledger entries.
-- Apply this after the original receipt-enforcement migration.
drop trigger if exists public.deposits_require_receipt on public.deposits;
drop trigger if exists public.expenses_require_voucher on public.expenses;
