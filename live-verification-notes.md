# Live verification notes

On 2026-09-06, `https://shomity93.netlify.app/` loaded successfully after a short wait. The live homepage exposed the Bengali navigation, visible `সদস্য / এডমিন প্রবেশ` and `হিসাব ব্যবস্থাপনায় প্রবেশ` controls, the gallery hero, CMS presentation content, member section, and Supabase-hosted logo/gallery assets. The live page was not blank; the initial blank viewport was a loading state.

The live homepage currently reports `৪৮ সক্রিয় সদস্য` and includes a real presentation post titled `প্রথম মিটিং`. This confirms the public content path is connected to Supabase. The protected `/hisab` authentication, Admin CMS persistence, receipt round-trip, and accounting transaction round-trip still require authenticated production testing and must not be claimed as verified without a user-provided login/entry flow.

The live `/hisab` route loaded the protected Bengali sign-in screen. The `সদস্য / এডমিন প্রবেশ` control opened an opaque dialog with visible `লগইন`, `সাইনআপ`, email, password, and `নিরাপদে লগইন` controls. This confirms the production auth form is visible and no longer the prior blank/invisible state. No credentials were entered or submitted during this verification.

The live signup tab is visible and includes full name, member ID, an all-country selector with dial codes, phone validation guidance, optional NID/passport fields, compressed profile-photo upload, email, password, and the Bengali signup action. No form was submitted and no real member data was created.
