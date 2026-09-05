import { createClient } from "@supabase/supabase-js";

type MemberStatus = "approved" | "suspended";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export async function sendMemberStatusEmail(input: { email: string; fullName: string; status: MemberStatus }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "সমিতি-নাইন্টি ত্রি";

  if (!apiKey || !senderEmail) {
    return { sent: false as const, reason: "Brevo API কী বা যাচাইকৃত প্রেরক ইমেইল কনফিগার করা হয়নি" };
  }

  const approved = input.status === "approved";
  const subject = approved ? "সমিতি-নাইন্টি ত্রি: সদস্য অনুমোদন সম্পন্ন" : "সমিতি-নাইন্টি ত্রি: সদস্যপদ স্থগিত";
  const message = approved
    ? "আপনার সদস্যতার আবেদন এডমিন অনুমোদন করেছেন। এখন আপনার ইমেইল ও পাসওয়ার্ড দিয়ে নিরাপদ হিসাব ব্যবস্থাপনায় প্রবেশ করতে পারবেন।"
    : "আপনার সদস্যপদ বর্তমানে স্থগিত করা হয়েছে। বিস্তারিত জানতে সমিতির এডমিনের সঙ্গে যোগাযোগ করুন।";

  const response = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: { accept: "application/json", "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: input.email, name: input.fullName }],
      subject,
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.7"><h2>${subject}</h2><p>প্রিয় ${input.fullName},</p><p>${message}</p><p>— ${senderName}</p></div>`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Brevo ইমেইল পাঠানো যায়নি (${response.status})${errorText ? `: ${errorText.slice(0, 180)}` : ""}`);
  }

  return { sent: true as const };
}

export async function sendMemberStatusEmailForSupabaseAdmin(input: { email: string; fullName: string; status: MemberStatus; accessToken: string }) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("সুপাবেস সার্ভার কনফিগারেশন পাওয়া যায়নি");

  const client = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${input.accessToken}` } } });
  const { data: authData, error: authError } = await client.auth.getUser(input.accessToken);
  if (authError || !authData.user) throw new Error("সুপাবেস সেশন যাচাই করা যায়নি");

  const { data: member, error: memberError } = await client.from("cooperative_members").select("role, status").eq("auth_user_id", authData.user.id).maybeSingle();
  if (memberError) throw memberError;
  if (!member || member.role !== "admin" || member.status !== "approved") throw new Error("শুধু অনুমোদিত এডমিন সদস্য-অবস্থা সংক্রান্ত ইমেইল পাঠাতে পারবেন");

  return sendMemberStatusEmail({ email: input.email, fullName: input.fullName, status: input.status });
}
