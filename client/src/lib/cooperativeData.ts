import { supabase } from "./supabase";
import { compressUpload } from "./imageCompression";

export type UploadFolder = "gallery" | "members" | "receipts" | "vouchers";

export async function uploadCooperativeFile(file: File, folder: UploadFolder) {
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
