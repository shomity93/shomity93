# Netlify production findings

- The public homepage loads at https://shomity93.netlify.app.
- The top navigation exposes a সদস্য প্রবেশ button and the হিসাব ব্যবস্থাপনা route.
- Clicking সদস্য প্রবেশ opens a Bengali modal with visible লগইন/সাইনআপ tabs, email and password fields, a নিরাপদে লগইন button, and a Close button.
- The browser accessibility extraction sees the modal controls, so the form is present in the deployed client bundle.
- The local verification shows the modal as an opaque, scrollable surface with visible Bengali login/signup fields; live submit behavior still requires production credentials and deployment verification.
- The deployed site is a static Netlify build; server-side `/api/trpc` behavior and Supabase/Brevo runtime calls still need production verification.

- Switching to signup shows all expected Bengali fields: full name, member ID, phone, profile photo, email, password, and signup request button.
- Browser console showed no output during the dialog interaction, so the reported issue is not a visible client-side exception in this reproduction.
- The production UI does not expose a separate Admin login button; it uses the same member login form and relies on the authenticated user role.

- After pushing commit b9df211 to GitHub, the live Netlify site still shows the previous title “সদস্য লগইন” rather than the new Bengali “সদস্য / এডমিন লগইন” label.
- The live modal controls are present and clickable, but the latest fix is not yet live; a Netlify deployment must be triggered or allowed to complete before production verification can pass.

- The live site at 2026-09-05 06:54 still shows the old mixed-language auth copy and the old CMS/presentation content, confirming that commit b9df211 has not reached the public Netlify deployment yet.
- The dialog is interactive and its login/signup fields are visible to the browser, but the deployment remains stale until a Netlify deploy is triggered.

- On the latest check after commit 2c91207, https://shomity93.netlify.app still exposes the older `সদস্য প্রবেশ` label and right-aligned navigation; the corrected local `সদস্য / এডমিন প্রবেশ` label and left-to-right layout are not yet deployed.
- The live dialog remains browser-detectable and interactive, but its surface is visibly more transparent than the corrected local modal. Netlify must be manually redeployed before the final live UI verification can be marked complete.
- The connected Supabase REST project currently returns zero approved rows for both `cooperative_members` and `member_invites`; no approved Admin/member record is visible through the current public RLS surface. An authenticated Admin must be created or promoted manually in Supabase.
