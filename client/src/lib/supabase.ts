import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export const isSupabaseConfigured = Boolean(supabase);

export async function findApprovedMember(email: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const normalizedEmail = email.trim().toLowerCase();
  const { data: invite, error: inviteError } = await supabase.from("member_invites").select("id, email, member_id, full_name, status").eq("email", normalizedEmail).eq("status", "approved").maybeSingle();
  if (inviteError) throw inviteError;
  if (invite) return invite;

  const { data: profile, error: profileError } = await supabase.from("cooperative_members").select("id, email, member_id, full_name, status, role").eq("email", normalizedEmail).eq("status", "approved").maybeSingle();
  if (profileError) throw profileError;
  return profile;
}

export async function signUpApprovedMember(input: { email: string; password: string; fullName: string; phone: string; memberId: string; photoUrl?: string }) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const approved = await findApprovedMember(input.email);
  if (!approved) throw new Error("এই ইমেইলটি এডমিন এখনও অনুমোদন করেননি");
  if (approved.member_id !== input.memberId) throw new Error("সদস্য আইডি মিলছে না");
  const { data, error } = await supabase.auth.signUp({ email: input.email.trim().toLowerCase(), password: input.password, options: { data: { full_name: input.fullName, phone: input.phone, member_id: input.memberId, photo_url: input.photoUrl ?? null, role: "member" } } });
  if (error) throw error;
  if (data.user) {
    const { error: profileError } = await supabase.from("cooperative_members").upsert({ auth_user_id: data.user.id, member_id: input.memberId, full_name: input.fullName, email: input.email.trim().toLowerCase(), phone: input.phone, photo_url: input.photoUrl ?? null, role: "member", status: "approved" }, { onConflict: "member_id" });
    if (profileError) throw profileError;
  }
  return data;
}

export async function signInMember(email: string, password: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const approved = await findApprovedMember(email);
  if (!approved) throw new Error("আপনার সদস্যপদ এখনও এডমিন অনুমোদন করেননি");
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

export type PublicGalleryItem = { id: string; src: string; title: string; eyebrow: string; text: string; sort_order: number; is_visible?: boolean };
type GalleryRow = { id: string; image_url: string; title: string; sort_order: number; is_visible?: boolean | null };
const toPublicGalleryItem = (item: GalleryRow): PublicGalleryItem => ({ id: item.id, src: item.image_url, title: item.title, eyebrow: "আমাদের গ্যালারি", text: "এডমিন সম্পাদিত গ্যালারি উপস্থাপনা।", sort_order: item.sort_order, is_visible: item.is_visible !== false });

export async function listGalleryItems(): Promise<PublicGalleryItem[]> {
  if (!supabase) return [];
  const result = await supabase.from("gallery").select("id, image_url, title, sort_order, is_visible").eq("is_visible", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (!result.error) return (result.data ?? []).map(toPublicGalleryItem);
  const fallback = await supabase.from("gallery").select("id, image_url, title, sort_order").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []).map((item) => toPublicGalleryItem({ ...item, is_visible: true }));
}

export async function listAllGalleryItems(): Promise<PublicGalleryItem[]> {
  if (!supabase) return [];
  const result = await supabase.from("gallery").select("id, image_url, title, sort_order, is_visible").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (!result.error) return (result.data ?? []).map(toPublicGalleryItem);
  const fallback = await supabase.from("gallery").select("id, image_url, title, sort_order").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []).map((item) => toPublicGalleryItem({ ...item, is_visible: true }));
}

const isMissingVisibilityColumn = (error: { code?: string; message?: string } | null) => Boolean(error && (error.code === "PGRST204" || error.message?.includes("is_visible")));

export async function updateGalleryItem(id: string, values: { sortOrder?: number; isVisible?: boolean }) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const payload: Record<string, unknown> = {};
  if (typeof values.sortOrder === "number") payload.sort_order = values.sortOrder;
  if (typeof values.isVisible === "boolean") payload.is_visible = values.isVisible;
  const result = await supabase.from("gallery").update(payload).eq("id", id);
  if (!result.error) return;
  if (!isMissingVisibilityColumn(result.error)) throw result.error;
  if (typeof values.isVisible === "boolean" && typeof values.sortOrder !== "number") throw new Error("গ্যালারি দৃশ্যমানতা পরিবর্তনের আগে Supabase-এর gallery migration চালান");
  const fallbackPayload = { ...(typeof values.sortOrder === "number" ? { sort_order: values.sortOrder } : {}) };
  const fallback = await supabase.from("gallery").update(fallbackPayload).eq("id", id);
  if (fallback.error) throw fallback.error;
}

export async function createGalleryItem(input: { imageUrl: string; storagePath: string; title: string; sortOrder: number }) {
  if (!supabase) return null;
  const result = await supabase.from("gallery").insert({ image_url: input.imageUrl, storage_path: input.storagePath, title: input.title, sort_order: input.sortOrder, is_visible: true }).select("id, image_url, title, sort_order, is_visible").single();
  if (!result.error) return result.data;
  if (!isMissingVisibilityColumn(result.error)) throw result.error;
  const fallback = await supabase.from("gallery").insert({ image_url: input.imageUrl, storage_path: input.storagePath, title: input.title, sort_order: input.sortOrder }).select("id, image_url, title, sort_order").single();
  if (fallback.error) throw fallback.error;
  return { ...fallback.data, is_visible: true };
}

export async function getSiteSettings() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("site_settings").select("id, name, tagline_one, tagline_two, contact_email, notice_text, logo_url, logo_path").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveSiteSettings(input: { name: string; taglineOne: string; taglineTwo: string; contactEmail: string; noticeText: string; logoUrl?: string; logoPath?: string }) {
  if (!supabase) return null;
  const { data: current } = await supabase.from("site_settings").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const payload = { name: input.name.trim(), tagline_one: input.taglineOne.trim(), tagline_two: input.taglineTwo.trim(), contact_email: input.contactEmail.trim(), notice_text: input.noticeText.trim(), logo_url: input.logoUrl ?? null, logo_path: input.logoPath ?? null, updated_at: new Date().toISOString() };
  const query = current?.id ? supabase.from("site_settings").update(payload).eq("id", current.id) : supabase.from("site_settings").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function subscribeToPublicContentChanges(onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase.channel("সমিতি-পাবলিক-কনটেন্ট").on("postgres_changes", { event: "*", schema: "public", table: "gallery" }, onChange).on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, onChange).subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function updateMemberPhoto(memberRowId: string, photoUrl: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { data, error } = await supabase.from("cooperative_members").update({ photo_url: photoUrl, updated_at: new Date().toISOString() }).eq("id", memberRowId).select("id, member_id, full_name, phone, photo_url, role, status").single();
  if (error) throw error;
  return data;
}
