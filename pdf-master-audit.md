# PDF Master Issue Audit

The supplied PDF is being treated as a full-system issue checklist rather than only a print defect. The current production schema contains the expected onboarding, CMS, and accounting tables and columns: `cooperative_members` includes country, dial code, NID, passport, and photo; `member_invites`, `member_sheets`, `site_settings`, `gallery`, `presentation_posts`, `deposits`, `expenses`, and `member_transactions` all exist with RLS enabled.

The live production data currently contains two canonical deposit rows for the same Admin member: `LD-001` for ৳৫,০০০ dated 2026-09-06 using bKash, and `L-002` for ৳৫,০০০ dated 2026-09-07 using cash. Both have no receipt URL. It also contains one direct `member_transactions` deposit row for ৳৫,০০০ dated 2026-09-06 using bKash, matching the date, amount, member, and payment method of `LD-001`. The application must show the canonical deposits in the ledger/member sheet but must not add the matching direct deposit again to the fund total. The direct row has no attachment.

Live expenses include `V-001` for ৳১,০০০ and `v-002` for ৳২,০০০, both without voucher URLs. Therefore the current live financial total should be computed from two canonical deposits (৳১০,০০০) less two expenses (৳৩,০০০), plus only non-deposit member adjustments. No live rows were inserted, modified, or deleted during this audit.

The earlier Netlify bundle mismatch remains an independent blocker: the deployed asset did not contain the latest canonical deposit filter or secure profile-photo RPC marker. The latest local/GitHub code contains those repairs, but the live deployment must be redeployed before final authenticated verification.
