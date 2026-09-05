import imageCompression from "browser-image-compression";

export async function compressUpload(file: File, folder: "gallery" | "members" | "receipts" | "vouchers" | "branding") {
  const compressed = await imageCompression(file, {
    maxSizeMB: folder === "gallery" ? 0.8 : folder === "branding" ? 0.15 : 0.35,
    maxWidthOrHeight: folder === "gallery" ? 1800 : folder === "branding" ? 900 : 1200,
    useWebWorker: true,
    fileType: file.type || "image/jpeg",
  });
  return new File([compressed], `${folder}-${Date.now()}-${file.name}`, { type: compressed.type || file.type });
}
