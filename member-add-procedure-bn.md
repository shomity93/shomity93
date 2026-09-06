# সদস্য যোগ করার সম্পূর্ণ পদ্ধতি

## বর্তমান সমস্যার নির্দিষ্ট কারণ

স্ক্রিনশটে ব্যবহৃত `abdullah79023745@gmail.com` email-এর production `member_invites` record বর্তমানে **suspended**। Database-এ এই email-এর নির্ধারিত member ID হলো **S-002**, কিন্তু স্ক্রিনশটে **S-001** লেখা হয়েছে। তাই এই email দিয়ে signup সম্পন্ন হবে না। আগে Admin Panel-এ invite-টি অনুমোদন করতে হবে এবং signup form-এ database-এর সঠিক member ID `S-002` ব্যবহার করতে হবে।

## পদ্ধতি A: Admin আগে সদস্য অনুমোদন করবেন

১. Admin email `shomity93@gmail.com` দিয়ে website-এ লগইন করুন।

২. Homepage থেকে **পরিচালনা ও বার্তা** অথবা Admin Panel খুলুন।

৩. **এডমিন সদস্য অনুমোদন** অংশে পূর্ণ নাম, email, mobile এবং member ID লিখুন। নতুন সদস্যের জন্য একটি unique member ID দিন, যেমন `S-003`। আগে database-এ থাকা member ID পুনরায় ব্যবহার করবেন না।

৪. **সদস্য অনুমোদন করুন** চাপুন। এতে `member_invites`-এ record-এর status `approved` হবে। Brevo ঠিকভাবে configured থাকলে member-এর email-এ notification যাবে।

৫. পুরোনো suspended invite ব্যবহার করলে Admin approval queue-তে সেই invite-এর পাশে **অনুমোদন** চাপুন। Screenshot-এর email-এর ক্ষেত্রে আগে নিশ্চিত করুন আপনি `S-002` ব্যবহার করছেন; `S-001` লিখলে ID mismatch দেখাবে।

## পদ্ধতি B: সদস্য নিজে approved email দিয়ে signup করবেন

১. Admin approval শেষ হওয়ার পর সদস্য homepage-এ **সদস্য / এডমিন প্রবেশ** চাপবেন।

২. **সাইনআপ** tab নির্বাচন করবেন।

৩. Admin যেই পূর্ণ নাম, email এবং member ID অনুমোদন করেছেন, ঠিক সেই তথ্য ব্যবহার করবেন। Email ছোট-বড় অক্ষর যেকোনোভাবে লেখা গেলেও member ID একই হতে হবে।

৪. দেশ নির্বাচন করবেন। দেশ নির্বাচন করলে country calling code নিজে পরিবর্তিত হবে।

৫. সম্পূর্ণ international mobile number লিখবেন। উদাহরণ: UAE হলে `+971...`।

৬. NID অথবা Passport-এর অন্তত একটি নম্বর দেবেন। Profile photo দিলে সেটি compress হয়ে Storage-এ যাবে।

৭. শক্তিশালী password দিয়ে **সাইনআপের অনুরোধ পাঠান** চাপবেন। Button text না দেখা গেলে এটি পুরোনো deployed bundle; সর্বশেষ checkpoint deploy করতে হবে।

৮. Supabase-এ Confirm email চালু থাকলে inbox-এ পাঠানো confirmation link চাপবেন। Confirmation শেষ না হলে login করা যাবে না।

## Signup সফল হলে কী তৈরি হবে

Email confirmation-এর পর সদস্য প্রথমবার login করলে system approved member profile-এর সঙ্গে Auth user UUID link করবে। এরপর `cooperative_members`-এ profile sync হবে এবং `member_sheets`-এ ঐ profile-এর জন্য একটি sheet upsert হবে। একই member ID-এর জন্য দ্বিতীয় sheet তৈরি হবে না।

## Member login-এর পর

সদস্য `/hisab` route-এ গিয়ে সব হিসাব দেখতে পারবেন। Member role read-only থাকবে। তিনি হিসাব add, edit বা delete করতে পারবেন না। Admin/Moderator member transaction entry form ব্যবহার করতে পারবেন এবং নতুন transaction dashboard totals-এ যুক্ত হবে।

## Status অনুযায়ী করণীয়

| বার্তা | অর্থ | করণীয় |
|---|---|---|
| Admin অনুমোদন প্রয়োজন | email/member invite pending | Admin Panel থেকে approve করুন |
| সদস্যপদ স্থগিত | invite বা profile suspended | Admin Panel থেকে approve করুন বা নতুন invite তৈরি করুন |
| সদস্য ID মিলছে না | form-এর ID database-এর approved ID-এর সঙ্গে মেলেনি | Admin-approved ID হুবহু লিখুন |
| এই email-এ আগে থেকেই account আছে | Supabase Auth user আগে তৈরি হয়েছে | Signup নয়, Login tab ব্যবহার করুন |
| confirmation link | Supabase email confirmation চালু | Email inbox থেকে link চাপুন |
| RLS permission blocked | database policy বা role সমস্যা | Admin session দিয়ে আবার চেষ্টা করুন; password নয়, error text সংরক্ষণ করুন |

## এই flow-এ যা করতে হবে না

প্রতিটি নতুন সদস্যের জন্য Netlify deploy, নতুন Supabase project, Supabase Auth-এ manually Add user, অথবা নতুন SQL migration প্রয়োজন নেই। Admin approval এবং website signup যথেষ্ট। Code/configuration পরিবর্তন হলে কেবল নতুন Netlify deployment প্রয়োজন।
