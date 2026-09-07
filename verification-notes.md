# Verification notes

The accounting page now includes Bengali receipt actions for `বড় করে দেখুন`, `ডাউনলোড`, and `নতুন ট্যাবে খুলুন`. Image receipts open in a responsive lightbox; PDF receipts open in an embedded viewer with a download action. The print flow uses a selected target for deposits, expenses, member sheets, or the chosen monthly/annual report and renders a dedicated print-only table rather than the full screen.

Canonical accounting changes route new member-sheet deposits into `deposits`, map them back into the member-sheet read path with a `deposit:<uuid>` identifier, and exclude deposit-type member transaction rows from dashboard/report adjustments to avoid double counting. Fines remain income adjustments; withdrawals and loans remain expense adjustments.

Local Vitest, TypeScript, and production build passed after these changes. Desktop screenshots show the Bengali homepage with the live gallery hero and the protected `/hisab` sign-in state with a visible button. The live Netlify bundle still requires owner-side deployment of the latest checkpoint before production verification.

The signup form now treats NID and passport numbers as optional, and the signup path avoids pre-session Storage uploads. After confirmation and authentication, the compressed profile photo uploads under the approved session and is persisted through `sync_member_photo`. The idempotent RPC migration was applied to production project `vqreuhjkhaqczbhducvk` and verified in `information_schema.routines`; no member or financial test data was inserted.

## Supplied PDF three-pass review

Reviewed `/home/ubuntu/upload/DOC-20260907-WA0118.pdf` three times. The six-page file is a print/capture artifact: page 1 is complaint text, page 2 includes the mobile app and Android printer UI, page 3 includes login/signup screenshots, and pages 4–6 are raw English member-contact lists. Text extraction also showed corrupted Bengali encoding and an empty page boundary. No reliable selected monthly/annual accounting report table was present.

## Repair applied

Accounting print mode now mounts only the selected target: deposit ledger, expense ledger, member sheets, or the selected monthly/annual report. A final print stylesheet hides the entire live application and browser-facing UI during print, exposes only `.print-output-root`, forces A4 portrait layout, keeps table headers, prevents row splitting, wraps long text, and prevents duplicate hidden sections or blank print pages.

## Validation

TypeScript validation passed, all 15 Vitest tests passed, and the production build passed. Desktop and mobile local screenshots show the public homepage and protected `/hisab` entry remain intact. The live Netlify bundle still requires owner-side redeployment separately; this checkpoint does not claim live PDF round-trip verification.

## Final print timing hardening

The print callback now waits for two animation frames after mounting the selected print surface before calling `window.print()`. This prevents slower mobile browsers from opening the dialog before the report DOM is painted. TypeScript, all 15 Vitest tests, and the production build passed again after this change.
