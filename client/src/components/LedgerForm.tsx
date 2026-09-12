import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { uploadCooperativeFile } from "@/lib/cooperativeData";

type Member = { id: string; member_id: string; full_name: string };
type Props = { type: "deposit" | "expense"; members: Member[]; initial?: Record<string, unknown>; onSubmit: (values: Record<string, unknown>) => Promise<void>; onCancel: () => void };

export default function LedgerForm({ type, members, initial, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<Record<string, string>>({ id: String(initial?.id ?? ""), transaction_id: String(initial?.transaction_id ?? ""), voucher_no: String(initial?.voucher_no ?? ""), occurred_on: String(initial?.occurred_on ?? new Date().toISOString().slice(0, 10)), description: String(initial?.description ?? ""), last_note: String(initial?.last_note ?? ""), member_id: String(initial?.member_id ?? ""), category: String(initial?.category ?? (type === "deposit" ? "monthly" : "others")), amount: String(initial?.amount ?? initial?.total_amount ?? ""), payment_method: String(initial?.payment_method ?? "cash"), file_url: String(initial?.file_url ?? ""), file_name: String(initial?.file_name ?? (initial?.file_url ? String(initial.file_url).split("/").pop() : "")), file_type: String(initial?.file_type ?? "সংযুক্ত ফাইল"), file_size: String(initial?.file_size ?? "") });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setError("");
    setPendingFile(selected);
    setValues((current) => ({ ...current, file_url: "", file_name: selected.name, file_type: selected.type || "ফাইল", file_size: String(Math.max(1, Math.round(selected.size / 1024))) }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.amount || Number(values.amount) <= 0) return setError("সঠিক পরিমাণ লিখুন");
    if (!values.occurred_on) return setError("তারিখ নির্বাচন করুন");
    if (type === "deposit" && (!values.transaction_id || !values.member_id)) return setError("লেনদেন আইডি ও সদস্য নির্বাচন করুন");
    if (type === "expense" && (!values.voucher_no || !values.description)) return setError("ভাউচার নম্বর ও খরচের বিবরণ দিন");
    const link = values.file_url.trim();
    if (link && !/^https?:\/\//i.test(link)) return setError("রসিদ লিংক http:// অথবা https:// দিয়ে শুরু করুন");
    setBusy(true);
    setError("");
    try {
      let uploaded = link ? { url: link, compressed: { name: values.file_name, type: values.file_type, size: Number.parseInt(values.file_size, 10) || 0 } } : null;
      let uploadWarning = "";
      if (pendingFile) {
        try {
          uploaded = await uploadCooperativeFile(pendingFile, type === "deposit" ? "receipts" : "vouchers");
        } catch (uploadError) {
          uploadWarning = uploadError instanceof Error ? uploadError.message : "ফাইল আপলোড হয়নি";
          uploaded = null;
        }
      }
      const file = uploaded?.url ? { url: uploaded.url, name: uploaded.compressed.name || values.file_name || null, type: uploaded.compressed.type || values.file_type || null, size: uploaded.compressed.size ? Math.max(1, Math.round(uploaded.compressed.size / 1024)) : (Number.parseInt(values.file_size, 10) || null) } : { url: null, name: values.file_name || null, type: values.file_type || null, size: Number.parseInt(values.file_size, 10) || null };
      await onSubmit(type === "deposit" ? { id: values.id || undefined, transaction_id: values.transaction_id.trim(), occurred_on: values.occurred_on, member_id: values.member_id, category: values.category, amount: Number(values.amount), payment_method: values.payment_method, last_note: values.last_note.trim() || null, receipt_url: file.url, receipt_name: file.name, receipt_type: file.type, receipt_size: file.size } : { id: values.id || undefined, voucher_no: values.voucher_no.trim(), occurred_on: values.occurred_on, description: values.description.trim(), last_note: values.last_note.trim() || null, category: values.category, total_amount: Number(values.amount), voucher_url: file.url, voucher_name: file.name, voucher_type: file.type, voucher_size: file.size });
      if (uploadWarning) setError(`এন্ট্রি সংরক্ষিত হয়েছে, কিন্তু ফাইল আপলোড হয়নি: ${uploadWarning}. পরে Google Drive link পেস্ট করে সম্পাদনা করুন।`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "সংরক্ষণ করা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  return <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}><DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900"><DialogHeader><DialogTitle>{initial ? "এন্ট্রি সম্পাদনা" : type === "deposit" ? "নতুন জমা এন্ট্রি" : "নতুন খরচ এন্ট্রি"}</DialogTitle></DialogHeader><CardContent className="p-0"><form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>{type === "deposit" ? <><div><Label>লেনদেন আইডি</Label><Input required value={values.transaction_id} onChange={(e) => set("transaction_id", e.target.value)} /></div><div><Label>সদস্য</Label><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" required value={values.member_id} onChange={(e) => set("member_id", e.target.value)}><option value="">সদস্য নির্বাচন করুন</option>{members.map((m) => <option key={m.id} value={m.id}>{m.full_name} · {m.member_id}</option>)}</select></div><div><Label>বিভাগ</Label><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={values.category} onChange={(e) => set("category", e.target.value)}><option value="monthly">মাসিক</option><option value="project">প্রকল্প</option><option value="fine">জরিমানা</option></select></div><div><Label>পেমেন্ট মাধ্যম</Label><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={values.payment_method} onChange={(e) => set("payment_method", e.target.value)}><option value="cash">নগদ</option><option value="bkash">বিকাশ</option><option value="bank">ব্যাংক</option></select></div></> : <><div><Label>ভাউচার নম্বর</Label><Input required value={values.voucher_no} onChange={(e) => set("voucher_no", e.target.value)} /></div><div><Label>খরচের বিবরণ</Label><Input required value={values.description} onChange={(e) => set("description", e.target.value)} /></div><div><Label>বিভাগ</Label><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={values.category} onChange={(e) => set("category", e.target.value)}><option value="office">অফিস</option><option value="project">প্রকল্প বিনিয়োগ</option><option value="others">অন্যান্য</option></select></div></>}<div className="md:col-span-2"><Label>শেষ নোট</Label><Textarea className="min-h-20" value={values.last_note} onChange={(e) => set("last_note", e.target.value)} placeholder="এই এন্ট্রি সম্পর্কে শেষ নোট লিখুন" /></div><div><Label>তারিখ</Label><Input required type="date" value={values.occurred_on} onChange={(e) => set("occurred_on", e.target.value)} /></div><div><Label>পরিমাণ</Label><Input required min="1" step="0.01" type="number" value={values.amount} onChange={(e) => set("amount", e.target.value)} /></div><div className="md:col-span-2"><Label>{type === "deposit" ? "রসিদ" : "বিল/ভাউচার ফাইল"}</Label><p className="mb-1 text-[11px] text-slate-500">রসিদ ঐচ্ছিক। ছবি নির্বাচন করলে সংরক্ষণের সময় upload হবে; upload ব্যর্থ হলেও হিসাব entry save হবে।</p><Input type="file" accept="image/*,application/pdf" disabled={busy} onChange={onFileSelected} />{pendingFile && <p className="mt-1 text-xs text-amber-700">নির্বাচিত ফাইল: {pendingFile.name} · সংরক্ষণ করুন চাপলে upload হবে</p>}<Label className="mt-2 block">Google Drive / রসিদ লিংক (ঐচ্ছিক)</Label><Input type="url" placeholder="https://drive.google.com/..." value={values.file_url} onChange={(e) => { setPendingFile(null); set("file_url", e.target.value); }} />{values.file_url && !pendingFile && <p className="mt-1 text-xs text-emerald-700">লিংক প্রস্তুত: <a className="underline" href={values.file_url} target="_blank" rel="noreferrer">রসিদ দেখুন</a></p>}</div>{error && <p className="text-sm text-rose-700 md:col-span-2" role="alert">{error}</p>}<div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={busy}>{busy ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>বাতিল</Button></div></form></CardContent></DialogContent></Dialog>;
}
