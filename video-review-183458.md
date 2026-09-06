# Frame-by-frame review: 183458.mp4

The recording shows an approved Admin account as `Ahmmed Ullah · ADMIN-001`, with the role card displaying `অ্যাডমিন` and the dashboard count showing `১ / ৫০` approved members. The member transaction form is visible and interactive from approximately 00:09 through 00:46. The user selects `Ahmed Ullah - ADMIN-001`, chooses monthly category and bKash payment, sets 6 September 2026, enters 5000, and selects an attachment.

At approximately 00:47 the screen redirects to the login/entry page. On returning to the dashboard, the transaction table still says `এখনো কোনো হিসাব এন্ট্রি পাওয়া যায়নি`, so no successful transaction persistence is visible in the recording. The video cannot prove whether the redirect came from an auth/session refresh, upload failure, or a mutation failure.

The Admin opens `সাইট কন্টেন্ট সম্পাদনা`, changes the association name to `প্রজেক্ট-৯৩`, selects a logo and gallery image, and clicks `পরিবর্তন সংরক্ষণ করুন`. The exact visible error is: `এই ইমেইলটি দিয়ে ইতিমধ্যে একাউন্ট খোলা হয়েছে, অনুগ্রহ করে অন্য ইমেইল ব্যবহার করুন অথবা আপনার ইমেইলটি পরিবর্তন করুন।` This indicates the CMS save path is incorrectly invoking a duplicate-account/signup-style operation rather than only updating site settings.

The homepage later shows a large animated member counter settling at `180745`, while the accounting dashboard shows `১ / ৫০`. The video does not establish that 180745 is a live count; it appears inconsistent with the approved-member count and requires code review.

Confirmed: Admin role visibility, member transaction form visibility, selected member, attempted transaction fields, empty post-attempt ledger, redirect, exact CMS duplicate-email error, and inconsistent homepage counter.

Not confirmed: successful transaction save, actual row count in `member_transactions`, persistence of CMS changes, or whether the redirect was caused by attachment upload or auth hydration.

## Second frame-by-frame review

The second analysis confirms the same flow with more precise timing. At 00:47, selecting a receipt immediately redirects from the transaction modal to the protected accounting gatekeeper, clearing unsaved form data. On the second attempt, the user fills the transaction again and clicks `সংরক্ষণ করুন` around 01:07–01:15; the modal closes but the transaction list remains empty. The video cannot distinguish whether this is an RLS rejection, a stale client refresh, or a swallowed mutation error.

The CMS error in this pass is visibly different from the earlier analysis: `এই নামের সদস্য ইতিমধ্যে বিদ্যমান, অনুগ্রহ করে অন্য নাম ব্যবহার করুন।` This duplicate-member-name message is unrelated to site settings or gallery save and proves the published CMS save path is invoking an unrelated member validation path or showing stale feedback. The uploaded gallery images do not persist. The homepage shows a contradictory 180745 member count, while the accounting dashboard shows 1/50. The approved Ahmed Ullah member card is visible at the bottom of the homepage and opens a profile modal, so the member read query can work in at least one deployed state.
