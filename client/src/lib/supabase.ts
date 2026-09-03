import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export const isSupabaseConfigured = Boolean(supabase);

export async function findApprovedMember(email: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { data, error } = await supabase.from("member_invites").select("id, email, member_id, full_name, status").eq("email", email.trim().toLowerCase()).eq("status", "approved").maybeSingle();
  if (error) throw error;
  return data;
}

export async function signUpApprovedMember(input: { email: string; password: string; fullName: string; phone: string; memberId: string; photoUrl?: string }) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const approved = await findApprovedMember(input.email);
  if (!approved) throw new Error("এই ইমেইলটি Admin এখনও অনুমোদন করেননি");
  if (approved.member_id !== input.memberId) throw new Error("সদস্য আইডি মিলছে না");
  const { data, error } = await supabase.auth.signUp({ email: input.email.trim().toLowerCase(), password: input.password, options: { data: { full_name: input.fullName, phone: input.phone, member_id: input.memberId, photo_url: input.photoUrl ?? null, role: "member" } } });
  if (error) throw error;
  if (data.user) {
    const { error: profileError } = await supabase.from("cooperative_members").upsert({ auth_user_id: data.user.id, member_id: input.memberId, full_name: input.fullName, phone: input.phone, photo_url: input.photoUrl ?? null, role: "member", status: "approved" }, { onConflict: "member_id" });
    if (profileError) throw profileError;
  }
  return data;
}

export async function signInMember(email: string, password: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const approved = await findApprovedMember(email);
  if (!approved) throw new Error("আপনার সদস্যপদ এখনও Admin অনুমোদন করেননি");
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return data;
}

export async function getCurrentMember() {
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data, error } = await supabase.from("cooperative_members").select("id, member_id, full_name, phone, photo_url, role, status").eq("auth_user_id", authData.user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listDeposits() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("deposits").select("id, transaction_id, occurred_on, category, amount, payment_method, receipt_url, receipt_name, receipt_type, receipt_size, member:cooperative_members(member_id, full_name), entered_by").order("occurred_on", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listExpenses() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("expenses").select("id, voucher_no, occurred_on, description, category, total_amount, voucher_url, voucher_name, voucher_type, voucher_size, entered_by").order("occurred_on", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listApprovedMembers() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("cooperative_members").select("id, member_id, full_name, phone, photo_url, role").eq("status", "approved").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listPendingInvites() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("member_invites").select("id, email, member_id, full_name, phone, status, created_at").in("status", ["pending", "approved"]).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLedgerEntry(table: "deposits" | "expenses", values: Record<string, unknown>) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { error } = await supabase.from(table).insert(values);
  if (error) throw error;
}

export async function updateLedgerEntry(table: "deposits" | "expenses", id: string, values: Record<string, unknown>) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { error } = await supabase.from(table).update(values).eq("id", id);
  if (error) throw error;
}

export async function deleteLedgerEntry(table: "deposits" | "expenses", id: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function createAdminInvite(input: { email: string; memberId: string; fullName: string; phone: string }) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { data, error } = await supabase.from("member_invites").insert({ email: input.email.trim().toLowerCase(), member_id: input.memberId.trim(), full_name: input.fullName.trim(), phone: input.phone.trim(), status: "approved" }).select().single();
  if (error) throw error;
  return data;
}

export async function getDashboardTotals() {
  if (!supabase) return null;
  const [{ data: deposits }, { data: expenses }] = await Promise.all([supabase.from("deposits").select("amount"), supabase.from("expenses").select("total_amount")]);
  const totalDeposits = (deposits ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  const totalExpenses = (expenses ?? []).reduce((sum, row) => sum + Number(row.total_amount), 0);
  return { totalDeposits, totalExpenses, currentFund: totalDeposits - totalExpenses };
}

export async function uploadMemberPhoto(file: File, memberId: string) {
  if (!supabase) return URL.createObjectURL(file);
  const path = `members/${memberId}-${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("cooperative-files").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("cooperative-files").getPublicUrl(path).data.publicUrl;
}

export async function updateInviteStatus(inviteId: string, status: "approved" | "suspended") {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { data, error } = await supabase.from("member_invites").update({ status, approved_at: status === "approved" ? new Date().toISOString() : null }).eq("id", inviteId).select().single();
  if (error) throw error;
  return data;
}

export async function subscribeToLedgerChanges(onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase.channel("সমিতি-হিসাব-খাতা").on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, onChange).on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, onChange).on("postgres_changes", { event: "*", schema: "public", table: "cooperative_members" }, onChange).subscribe();
  return () => { void supabase.removeChannel(channel); };
}
