import { supabase } from "./supabase";
import { compressUpload } from "./imageCompression";

export type UploadFolder = "gallery" | "members" | "receipts" | "vouchers" | "branding";

export function validateCooperativeUpload(file: Pick<File, "name" | "size" | "type">) {
  const supported = file.type.startsWith("image/") || file.type === "application/pdf";
  return supported && file.size > 0 && file.size <= 10 * 1024 * 1024 && file.name.trim().length > 0;
}

export async function uploadCooperativeFile(file: File, folder: UploadFolder) {
  if (!validateCooperativeUpload(file)) throw new Error("শুধু ছবি বা PDF ফাইল (সর্বোচ্চ ১০ MB) আপলোড করা যাবে");
  const compressed = file.type.startsWith("image/") ? await compressUpload(file, folder) : file;
  const path = `${folder}/${Date.now()}-${compressed.name}`;
  if (!supabase) return { path, url: URL.createObjectURL(compressed), compressed };
  const { error } = await supabase.storage.from("cooperative-files").upload(path, compressed, { upsert: false, contentType: compressed.type });
  if (error) throw error;
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
