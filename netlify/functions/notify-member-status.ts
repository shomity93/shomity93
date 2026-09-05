import { createClient } from "@supabase/supabase-js";

export const handler = async (event: { httpMethod: string; headers: Record<string, string | undefined>; body: string | null }) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ message: "শুধু POST অনুরোধ গ্রহণযোগ্য" }) };

  const authorization = event.headers.authorization ?? event.headers.Authorization ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "সমিতি-নাইন্টি ত্রি";

  if (!accessToken || !supabaseUrl || !supabaseAnonKey) return { statusCode: 401, body: JSON.stringify({ message: "সুপাবেস সেশন পাওয়া যায়নি" }) };
  if (!brevoApiKey || !senderEmail) return { statusCode: 503, body: JSON.stringify({ message: "Brevo প্রেরক কনফিগারেশন অসম্পূর্ণ" }) };

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) return { statusCode: 401, body: JSON.stringify({ message: "সুপাবেস সেশন যাচাই করা যায়নি" }) };

  const { data: member, error: memberError } = await supabase.from("cooperative_members").select("role, status").eq("auth_user_id", authData.user.id).maybeSingle();
  if (memberError) return { statusCode: 500, body: JSON.stringify({ message: "এডমিনের ভূমিকা যাচাই করা যায়নি" }) };
  if (!member || member.role !== "admin" || member.status !== "approved") return { statusCode: 403, body: JSON.stringify({ message: "শুধু অনুমোদিত এডমিন সদস্য-অবস্থা সংক্রান্ত ইমেইল পাঠাতে পারবেন" }) };

  let input: { email?: string; fullName?: string; status?: "approved" | "suspended" };
  try { input = JSON.parse(event.body ?? "{}"); } catch { return { statusCode: 400, body: JSON.stringify({ message: "অনুরোধের তথ্য সঠিক নয়" }) }; }
  if (!input.email || !input.fullName || !input.status) return { statusCode: 400, body: JSON.stringify({ message: "সদস্যের ইমেইল, নাম ও অবস্থা প্রয়োজন" }) };

  const approved = input.status === "approved";
  const subject = approved ? "সমিতি-নাইন্টি ত্রি: সদস্য অনুমোদন সম্পন্ন" : "সমিতি-নাইন্টি ত্রি: সদস্যপদ স্থগিত";
  const message = approved ? "আপনার সদস্যতার আবেদন এডমিন অনুমোদন করেছেন। এখন আপনার ইমেইল ও পাসওয়ার্ড দিয়ে নিরাপদ হিসাব ব্যবস্থাপনায় প্রবেশ করতে পারবেন।" : "আপনার সদস্যপদ বর্তমানে স্থগিত করা হয়েছে। বিস্তারিত জানতে এডমিনের সঙ্গে যোগাযোগ করুন।";
  const response = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { accept: "application/json", "api-key": brevoApiKey, "content-type": "application/json" }, body: JSON.stringify({ sender: { email: senderEmail, name: senderName }, to: [{ email: input.email, name: input.fullName }], subject, htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.7"><h2>${subject}</h2><p>প্রিয় ${input.fullName},</p><p>${message}</p><p>— ${senderName}</p></div>` }) });
  if (!response.ok) return { statusCode: 502, body: JSON.stringify({ message: "Brevo ইমেইল পাঠাতে পারেনি" }) };
  return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ sent: true }) };
};
