export function readableAuthError(error: unknown): string {
  const record = error && typeof error === "object"
    ? error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    : null;
  const message = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : [record?.message, record?.details, record?.hint, record?.code]
        .filter((value) => value != null && String(value).trim())
        .map(String)
        .join(" · ");
  const lower = message.toLowerCase();
  if (lower.includes("user already registered") || lower.includes("already been registered")) return "এই ইমেইলে আগে থেকেই account আছে। লগইন tab ব্যবহার করুন অথবা Admin-এর কাছে email যাচাই করুন।";
  if (lower.includes("email not confirmed")) return "ইমেইলে পাঠানো confirmation link চাপুন, তারপর লগইন করুন।";
  if (lower.includes("rate limit") || lower.includes("rate_limit") || lower.includes("too many requests")) return "Supabase-এর email/login rate limit সাময়িকভাবে পূর্ণ হয়েছে। বারবার চেষ্টা করবেন না; কিছু সময় অপেক্ষা করে আবার চেষ্টা করুন। Brevo reset করলে এই Supabase limit কমবে না।";
  if (lower.includes("row-level security") || lower.includes("permission denied")) return "এই তথ্য সংরক্ষণের অনুমতি Supabase-এ blocked হয়েছে। Admin policy যাচাই করুন।";
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) return "এই email বা সদস্য ID আগে থেকেই ব্যবহৃত হয়েছে। অন্যটি দিন।";
  if (lower.includes("function") && lower.includes("does not exist")) return "Supabase-এ signup sync function পাওয়া যাচ্ছে না। Database migration সম্পন্ন হয়নি।";
  if (lower.includes("email ও সদস্য id") || lower.includes("অনুমোদন পাওয়া যায়নি")) return "এই email ও সদস্য ID-এর Admin অনুমোদন পাওয়া যায়নি।";
  return message && message !== "[object Object]" ? message : "অনুরোধটি সম্পন্ন করা যায়নি";
}
