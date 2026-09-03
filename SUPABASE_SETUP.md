# সমিতি-নাইন্টি ত্রি: Supabase সেটআপ

এই প্রকল্পে ব্রাউজার-সাইড কম্প্রেশন, Supabase Storage আপলোড, এবং `deposits` ও `expenses` টেবিলের Realtime সাবস্ক্রিপশনের জন্য প্রস্তুত স্তর রাখা হয়েছে। `.env.local.example` কপি করে `.env.local` তৈরি করুন এবং নিজের Supabase প্রকল্পের URL ও anon key বসান। Netlify-তে একই মান `VITE_SUPABASE_URL` এবং `VITE_SUPABASE_ANON_KEY` নামে যোগ করতে হবে।

`supabase/schema.sql` ফাইলটি Supabase SQL Editor-এ চালিয়ে টেবিল, enum, মৌলিক RLS read policy এবং Realtime publication তৈরি করুন। এরপর `cooperative-files` নামে একটি Storage bucket তৈরি করে authenticated ব্যবহারকারীদের জন্য read policy এবং Admin/Moderator-এর জন্য upload policy নির্ধারণ করুন।

ভূমিকা নির্ধারণের জন্য `admin`, `moderator`, এবং `member` enum ব্যবহার করা হয়েছে। সদস্যরা সব ledger দেখতে পারবেন; Moderator জমা ও খরচের রেকর্ড যোগ বা সম্পাদনা করতে পারবেন কিন্তু মুছতে পারবেন না; Admin পূর্ণ নিয়ন্ত্রণ রাখবেন। উৎপাদন ব্যবহারের আগে Supabase Auth user metadata অথবা একটি server-side role table দিয়ে এই নীতিগুলো RLS policy-তে প্রয়োগ করুন।

নিরাপত্তার কারণে browser-এ কেবল anon key ব্যবহার করুন। service role key কখনও client bundle বা Git repository-তে রাখবেন না।
