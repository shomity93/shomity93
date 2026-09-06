import { createClient } from "@supabase/supabase-js";
import { calculateDashboardTotals } from "@shared/accounting";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export const isSupabaseConfigured = Boolean(supabase);

export async function findApprovedMember(email: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const normalizedEmail = email.trim().toLowerCase();
  const { data: invite, error: inviteError } = await supabase.from("member_invites").select("id, email, member_id, full_name, phone, country, country_code, national_id, passport_number, status").eq("email", normalizedEmail).maybeSingle();
  if (inviteError) throw inviteError;
  if (invite) return invite;
  const { data: profile, error: profileError } = await supabase.from("cooperative_members").select("id, email, member_id, full_name, phone, country, country_code, national_id, passport_number, status, role").eq("email", normalizedEmail).eq("status", "approved").maybeSingle();
  if (profileError) throw profileError;
  return profile;
}

export async function requestMemberApproval(input: { email: string; fullName: string; phone: string; memberId: string; country?: string; countryCode?: string; nationalId?: string; passportNumber?: string }) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const payload = { email: input.email.trim().toLowerCase(), member_id: input.memberId.trim(), full_name: input.fullName.trim(), phone: input.phone.trim(), country: input.country?.trim() || null, country_code: input.countryCode?.trim() || null, national_id: input.nationalId?.trim() || null, passport_number: input.passportNumber?.trim() || null, status: "pending" as const };
  const { data, error } = await supabase.rpc("request_member_approval", { p_email: payload.email, p_member_id: payload.member_id, p_full_name: payload.full_name, p_phone: payload.phone, p_country: payload.country, p_country_code: payload.country_code, p_national_id: payload.national_id, p_passport_number: payload.passport_number });
  if (error) throw error;
  return data;
}

async function syncApprovedMemberProfile(input: { email: string; fullName: string; phone: string; memberId: string; country?: string; countryCode?: string; nationalId?: string; passportNumber?: string; photoUrl?: string | null }, userId: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { data, error } = await supabase.rpc("sync_approved_member_profile", { p_email: input.email.trim().toLowerCase(), p_full_name: input.fullName.trim(), p_phone: input.phone.trim(), p_member_id: input.memberId.trim(), p_country: input.country?.trim() || null, p_country_code: input.countryCode?.trim() || null, p_national_id: input.nationalId?.trim() || null, p_passport_number: input.passportNumber?.trim() || null, p_photo_url: input.photoUrl ?? null });
  if (error) throw error;
  return { id: data, auth_user_id: userId };
}

async function syncMemberPhoto(photoUrl: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { error } = await supabase.rpc("sync_member_photo", { p_photo_url: photoUrl });
  if (error) throw error;
}

export async function signUpApprovedMember(input: { email: string; password: string; fullName: string; phone: string; memberId: string; country?: string; countryCode?: string; nationalId?: string; passportNumber?: string; photoFile?: File }) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const approved = await findApprovedMember(input.email);
  if (!approved) { await requestMemberApproval(input); throw new Error("সাইনআপের অনুরোধ পাঠানো হয়েছে। এডমিন অনুমোদনের পর আবার সাইনআপ করুন"); }
  if (approved.status === "suspended") throw new Error("এই সদস্যপদ স্থগিত আছে। Admin Panel থেকে সদস্যকে অনুমোদন করতে হবে");
  if (approved.status !== "approved") throw new Error("এই email-এর অনুমোদন এখনো সম্পন্ন হয়নি। Admin Panel থেকে আগে অনুমোদন নিন");
  if (approved.member_id.trim().toLowerCase() !== input.memberId.trim().toLowerCase()) throw new Error("সদস্য আইডি মিলছে না");
  const { data, error } = await supabase.auth.signUp({ email: input.email.trim().toLowerCase(), password: input.password, options: { data: { full_name: input.fullName, phone: input.phone, member_id: input.memberId, country: input.country ?? null, country_code: input.countryCode ?? null, national_id: input.nationalId ?? null, passport_number: input.passportNumber ?? null, photo_url: null, role: "member" } } });
  if (error) throw error;
  if (data.user && data.session) {
    await syncApprovedMemberProfile({ ...input, photoUrl: null }, data.user.id);
    if (input.photoFile) {
      const photoUrl = await uploadMemberPhoto(input.photoFile, input.memberId);
      await syncMemberPhoto(photoUrl);
    }
  }
  if (data.session) window.dispatchEvent(new Event("supabase-session-changed"));
  return { ...data, photoDeferred: Boolean(input.photoFile && !data.session) };
}

export async function signInMember(email: string, password: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const approved = await findApprovedMember(email);
  if (!approved) throw new Error("আপনার ইমেইলটি এডমিন অনুমোদিত তালিকায় নেই");
  if (approved.status === "suspended") throw new Error("এই সদস্যপদ স্থগিত আছে। Admin-এর সঙ্গে যোগাযোগ করুন");
  if (approved.status !== "approved") throw new Error("আপনার সদস্যপদ এখনো Admin অনুমোদন করেননি");
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  const metadata = data.user.user_metadata ?? {};
  await syncApprovedMemberProfile({ email, fullName: String(metadata.full_name ?? approved.full_name), phone: String(metadata.phone ?? approved.phone ?? ""), memberId: String(metadata.member_id ?? approved.member_id), country: String(metadata.country ?? approved.country ?? ""), countryCode: String(metadata.country_code ?? approved.country_code ?? ""), nationalId: String(metadata.national_id ?? approved.national_id ?? ""), passportNumber: String(metadata.passport_number ?? approved.passport_number ?? ""), photoUrl: typeof metadata.photo_url === "string" ? metadata.photo_url : null }, data.user.id);
  window.dispatchEvent(new Event("supabase-session-changed"));
  return data;
}

export async function signOutMember() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.dispatchEvent(new Event("supabase-session-changed"));
}

export async function getCurrentAuthUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getCurrentMember() {
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data, error } = await supabase.from("cooperative_members").select("id, auth_user_id, member_id, full_name, email, phone, country, country_code, national_id, passport_number, photo_url, role, status").eq("auth_user_id", authData.user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listDeposits() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("deposits").select("id, transaction_id, occurred_on, category, amount, payment_method, receipt_url, receipt_name, receipt_type, receipt_size, member:cooperative_members(id, member_id, full_name), entered_by").order("occurred_on", { ascending: false });
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
  const { data, error } = await supabase.from("cooperative_members").select("id, member_id, full_name, email, phone, country, country_code, national_id, passport_number, photo_url, role, status").eq("status", "approved").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listPublicMembers() {
  if (!supabase) return [] as Array<{ id: string; member_id: string; full_name: string; photo_url?: string | null }>;
  const { data, error } = await supabase.from("member_directory").select("id, member_id, full_name, photo_url").order("full_name", { ascending: true }).limit(100);
  if (error) { if (error.code === "42P01" || error.code === "42501") return []; throw error; }
  return (data ?? []) as Array<{ id: string; member_id: string; full_name: string; photo_url?: string | null }>;
}

export async function listMemberSheets() {
  if (!supabase) return [] as Array<{ id: string; member_id: string }>;
  const { data, error } = await supabase.from("member_sheets").select("id, member_id").order("created_at", { ascending: true }).limit(100);
  if (error) { if (error.code === "42P01") return []; throw error; }
  return (data ?? []) as Array<{ id: string; member_id: string }>;
}

export async function listPendingInvites() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("member_invites").select("id, email, member_id, full_name, phone, country, country_code, national_id, passport_number, status, created_at").in("status", ["pending", "approved"]).order("created_at", { ascending: false });
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

export async function createAdminInvite(input: { email: string; memberId: string; fullName: string; phone: string; country?: string; countryCode?: string; nationalId?: string; passportNumber?: string }) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { data, error } = await supabase.from("member_invites").upsert({ email: input.email.trim().toLowerCase(), member_id: input.memberId.trim(), full_name: input.fullName.trim(), phone: input.phone.trim(), country: input.country?.trim() || null, country_code: input.countryCode?.trim() || null, national_id: input.nationalId?.trim() || null, passport_number: input.passportNumber?.trim() || null, status: "approved" }, { onConflict: "email" }).select().single();
  if (error) throw error;
  return data;
}

export async function getDashboardTotals() {
  if (!supabase) return null;
  const [{ data: deposits }, { data: expenses }, transactionResult] = await Promise.all([supabase.from("deposits").select("amount"), supabase.from("expenses").select("total_amount"), supabase.from("member_transactions").select("transaction_type, amount")]);
  const transactions = transactionResult.error ? [] : (transactionResult.data ?? []);
  return calculateDashboardTotals((deposits ?? []).map((row) => row.amount), (expenses ?? []).map((row) => row.total_amount), transactions.filter((row) => row.transaction_type !== "deposit") as Array<{ transaction_type: "deposit" | "withdrawal" | "fine" | "loan"; amount: number | string }>);
}

export async function uploadMemberPhoto(file: File, memberId: string) {
  if (!supabase) return URL.createObjectURL(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `members/${memberId}-${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("cooperative-files").upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
  if (error) throw new Error(`প্রোফাইল ছবি সংরক্ষণ করা যায়নি: ${error.message}`);
  return supabase.storage.from("cooperative-files").getPublicUrl(path).data.publicUrl;
}

export async function updateInviteStatus(inviteId: string, status: "approved" | "suspended") {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const sessionResult = await supabase.auth.getSession();
  const { data, error } = await supabase.from("member_invites").update({ status, approved_by: sessionResult.data.session?.user.id ?? null, approved_at: status === "approved" ? new Date().toISOString() : null }).eq("id", inviteId).select().single();
  if (error) throw error;
  return data;
}

export async function subscribeToLedgerChanges(onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase.channel("সমিতি-হিসাব-খাতা").on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, onChange).on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, onChange).on("postgres_changes", { event: "*", schema: "public", table: "member_transactions" }, onChange).on("postgres_changes", { event: "*", schema: "public", table: "cooperative_members" }, onChange).subscribe();
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
  const channel = supabase.channel("সমিতি-পাবলিক-কনটেন্ট").on("postgres_changes", { event: "*", schema: "public", table: "gallery" }, onChange).on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, onChange).on("postgres_changes", { event: "*", schema: "public", table: "presentation_posts" }, onChange).subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export type MemberTransaction = { id: string; member_id: string; transaction_date: string; transaction_type: "deposit" | "withdrawal" | "fine" | "loan"; description: string; amount: number; payment_method: string; attachment_url?: string | null; attachment_name?: string | null; attachment_type?: string | null; attachment_size?: number | null; entered_by?: string | null; member?: { id: string; member_id: string; full_name: string } | Array<{ id: string; member_id: string; full_name: string }> | null };

export async function listMemberTransactions() {
  if (!supabase) return [] as MemberTransaction[];
  const [transactionResult, depositResult] = await Promise.all([
    supabase.from("member_transactions").select("id, member_id, transaction_date, transaction_type, description, amount, payment_method, attachment_url, attachment_name, attachment_type, attachment_size, entered_by, member:cooperative_members(id, member_id, full_name)").order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("deposits").select("id, member_id, occurred_on, transaction_id, amount, payment_method, receipt_url, receipt_name, receipt_type, receipt_size, entered_by, member:cooperative_members(id, member_id, full_name)").order("occurred_on", { ascending: false }),
  ]);
  if (transactionResult.error && transactionResult.error.code !== "42P01" && !transactionResult.error.message.includes("member_transactions")) throw transactionResult.error;
  if (depositResult.error) throw depositResult.error;
  const directRows = ((transactionResult.data ?? []) as MemberTransaction[]).filter((row) => row.transaction_type !== "deposit");
  const depositRows = (depositResult.data ?? []).map((row) => ({
    id: `deposit:${row.id}`,
    member_id: row.member_id,
    transaction_date: row.occurred_on,
    transaction_type: "deposit" as const,
    description: row.transaction_id || "জমা",
    amount: Number(row.amount),
    payment_method: row.payment_method,
    attachment_url: row.receipt_url,
    attachment_name: row.receipt_name,
    attachment_type: row.receipt_type,
    attachment_size: row.receipt_size,
    entered_by: row.entered_by,
    member: row.member,
  }));
  return [...depositRows, ...directRows].sort((a, b) => String(b.transaction_date).localeCompare(String(a.transaction_date)));
}

const memberTransactionFields = ["member_id", "transaction_date", "transaction_type", "description", "amount", "payment_method", "attachment_url", "attachment_name", "attachment_type", "attachment_size", "entered_by"] as const;

function normalizeMemberTransaction(values: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const field of memberTransactionFields) {
    if (values[field] !== undefined) payload[field] = values[field];
  }
  if (payload.description !== undefined) payload.description = String(payload.description).trim();
  if (payload.amount !== undefined) payload.amount = Number(payload.amount);
  if (payload.attachment_size === "" || payload.attachment_size === null) payload.attachment_size = null;
  else if (payload.attachment_size !== undefined) payload.attachment_size = Number(payload.attachment_size);
  return payload;
}

function memberTransactionError(error: { message?: string; code?: string; details?: string; hint?: string }) {
  const suffix = [error.code, error.details, error.hint].filter(Boolean).join(" · ");
  return new Error(`সদস্যের হিসাব সংরক্ষণ করা যায়নি${suffix ? ` (${suffix})` : ""}: ${error.message ?? "Supabase mutation failed"}`);
}

export async function createMemberTransaction(values: Record<string, unknown>) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const payload = normalizeMemberTransaction(values);
  if (!payload.member_id || !payload.transaction_date || !payload.transaction_type || !payload.description || !payload.amount || !payload.payment_method) {
    throw new Error("সদস্য, তারিখ, হিসাবের ধরন, বিবরণ, পরিমাণ ও পেমেন্ট মাধ্যম পূরণ করুন");
  }
  if (payload.transaction_type === "deposit") {
    const { data, error } = await supabase.from("deposits").insert({ transaction_id: `MT-${String(payload.description).slice(0, 24).replace(/\s+/g, "-")}-${Date.now()}`, occurred_on: payload.transaction_date, member_id: payload.member_id, category: "monthly", amount: payload.amount, payment_method: payload.payment_method, receipt_url: payload.attachment_url ?? null, receipt_name: payload.attachment_name ?? null, receipt_type: payload.attachment_type ?? null, receipt_size: payload.attachment_size ?? null, entered_by: payload.entered_by ?? null }).select("id").single();
    if (error) throw memberTransactionError(error);
    return { ...payload, id: data?.id ? `deposit:${data.id}` : undefined };
  }
  const { error } = await supabase.from("member_transactions").insert(payload);
  if (error) throw memberTransactionError(error);
  return payload;
}

export async function updateMemberTransaction(id: string, values: Record<string, unknown>) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const payload = normalizeMemberTransaction(values);
  if (id.startsWith("deposit:")) {
    const { error } = await supabase.from("deposits").update({ occurred_on: payload.transaction_date, member_id: payload.member_id, amount: payload.amount, payment_method: payload.payment_method, receipt_url: payload.attachment_url ?? null, receipt_name: payload.attachment_name ?? null, receipt_type: payload.attachment_type ?? null, receipt_size: payload.attachment_size ?? null }).eq("id", id.slice("deposit:".length));
    if (error) throw memberTransactionError(error);
    return;
  }
  const { error } = await supabase.from("member_transactions").update(payload).eq("id", id);
  if (error) throw memberTransactionError(error);
}

export async function deleteMemberTransaction(id: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const query = id.startsWith("deposit:") ? supabase.from("deposits").delete().eq("id", id.slice("deposit:".length)) : supabase.from("member_transactions").delete().eq("id", id);
  const { error } = await query;
  if (error) throw memberTransactionError(error);
}

export type PresentationPost = { id: string; title: string; body_text: string; image_url?: string | null; storage_path?: string | null; sort_order: number; is_visible: boolean; created_at?: string };

export async function listPresentationPosts(includeHidden = false) {
  if (!supabase) return [] as PresentationPost[];
  let query = supabase.from("presentation_posts").select("id, title, body_text, image_url, storage_path, sort_order, is_visible, created_at").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (!includeHidden) query = query.eq("is_visible", true);
  const { data, error } = await query;
  if (error) { if (error.code === "42P01" || error.message.includes("presentation_posts")) return []; throw error; }
  return (data ?? []) as PresentationPost[];
}

export async function createPresentationPost(input: { title: string; bodyText: string; imageUrl?: string | null; storagePath?: string | null; sortOrder: number }) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { data, error } = await supabase.from("presentation_posts").insert({ title: input.title.trim(), body_text: input.bodyText.trim(), image_url: input.imageUrl ?? null, storage_path: input.storagePath ?? null, sort_order: input.sortOrder, is_visible: true }).select().single();
  if (error) throw error;
  return data as PresentationPost;
}

export async function updatePresentationPost(id: string, values: Partial<Pick<PresentationPost, "title" | "body_text" | "image_url" | "storage_path" | "sort_order" | "is_visible">>) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { error } = await supabase.from("presentation_posts").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deletePresentationPost(id: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { error } = await supabase.from("presentation_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function updateMemberPhoto(memberRowId: string, photoUrl: string) {
  if (!supabase) throw new Error("সুপাবেস সংযোগ কনফিগার করা হয়নি");
  const { data, error } = await supabase.from("cooperative_members").update({ photo_url: photoUrl, updated_at: new Date().toISOString() }).eq("id", memberRowId).select("id, member_id, full_name, phone, photo_url, role, status").single();
  if (error) throw error;
  return data;
}
