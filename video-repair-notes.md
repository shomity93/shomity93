# Screen recording repair findings — 2026-09-08

The supplied recording was analyzed frame by frame. The observed defects are:

1. Around 00:00:20–00:00:23, the accounting header/sidebar navigation appears duplicated inside the dashboard content after refresh or transaction completion. The expected structure is one global navigation surface and one content surface.
2. Around 00:00:04–00:00:07, selecting a receipt/voucher in the নতুন খরচ যুক্ত করুন modal redirects to the হিসাব ব্যবস্থাপনা lock/login screen. The file must remain staged locally and the modal must remain open until explicit save.
3. Around 00:00:19–00:00:22, slider content overlaps and jitters during load/autoplay; text escapes its pill/container. Each slide needs a stable bounded layout and safe index/transition behavior.
4. Around 00:00:16–00:00:18, the viewed member has a numeric identity such as 42598381, while the all-accounts transaction IDs show V-001/V-002. The UI must distinguish transaction IDs from member IDs and preserve a stable member mapping.
5. Around 00:00:13–00:00:15, opening the expense modal leaves the background interactive and clicking outside can dismiss entered data. A backdrop, explicit cancel/reset behavior, and save validation are required.

The video appears to show the Manus preview/live project rather than Netlify. These findings are treated as evidence; no financial rows are to be fabricated or deleted while repairing them.
