# Verification notes

The accounting page now includes Bengali receipt actions for `বড় করে দেখুন`, `ডাউনলোড`, and `নতুন ট্যাবে খুলুন`. Image receipts open in a responsive lightbox; PDF receipts open in an embedded viewer with a download action. The print flow uses a selected target for deposits, expenses, member sheets, or the chosen monthly/annual report and renders a dedicated print-only table rather than the full screen.

Canonical accounting changes route new member-sheet deposits into `deposits`, map them back into the member-sheet read path with a `deposit:<uuid>` identifier, and exclude deposit-type member transaction rows from dashboard/report adjustments to avoid double counting. Fines remain income adjustments; withdrawals and loans remain expense adjustments.

Local Vitest, TypeScript, and production build passed after these changes. Desktop screenshots show the Bengali homepage with the live gallery hero and the protected `/hisab` sign-in state with a visible button. The live Netlify bundle still requires owner-side deployment of the latest checkpoint before production verification.
