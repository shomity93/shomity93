import { supabase } from "./supabase";
import { compressUpload } from "./imageCompression";

export type UploadFolder = "gallery" | "members" | "receipts" | "vouchers" | "branding" | "presentation";

export function validateCooperativeUpload(file: Pick<File, "name" | "size" | "type">) {
  const supported = file.type.startsWith("image/") || file.type === "application/pdf";
  return supported && file.size > 0 && file.size <= 50 * 1024 * 1024 && file.name.trim().length > 0;
}

export async function uploadCooperativeFile(file: File, folder: UploadFolder) {
  if (!validateCooperativeUpload(file)) throw new Error("শুধু ছবি বা PDF ফাইল (সর্বোচ্চ ৫০ MB প্রতি ফাইল) আপলোড করা যাবে");
  const compressed = file.type.startsWith("image/") ? await compressUpload(file, folder) : file;
  const safeName = compressed.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${folder}/${Date.now()}-${safeName}`;
  if (!supabase) return { path, url: URL.createObjectURL(compressed), compressed };
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error("সেশন পাওয়া যায়নি; আগে আবার লগইন করুন, তারপর receipt upload করুন");
  const { error } = await supabase.storage.from("cooperative-files").upload(path, compressed, { upsert: true, contentType: compressed.type || "application/octet-stream", cacheControl: "3600" });
  if (error) throw new Error(`Storage upload ব্যর্থ: ${error.message}`);
  const { data } = supabase.storage.from("cooperative-files").getPublicUrl(path);
  return { path, url: data.publicUrl, compressed };
}

export function validateAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 10_000_000;
}

export function validateLedgerIdentity(value: string) {
  return value.trim().length >= 3 && value.trim().length <= 120;
}
