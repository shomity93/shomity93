import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadCooperativeFile } from "@/lib/cooperativeData";

type Member = { id: string; member_id: string; full_name: string };
type Props = { type: "deposit" | "expense"; members: Member[]; initial?: Record<string, unknown>; onSubmit: (values: Record<string, unknown>) => Promise<void>; onCancel: () => void };

export default function LedgerForm({ type, members, initial, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState<Record<string, string>>({ id: String(initial?.id ?? ""), transaction_id: String(initial?.transaction_id ?? ""), voucher_no: String(initial?.voucher_no ?? ""), occurred_on: String(initial?.occurred_on ?? new Date().toISOString().slice(0, 10)), description: String(initial?.description ?? ""), member_id: String(initial?.member_id ?? ""), category: String(initial?.category ?? (type === "deposit" ? "monthly" : "others")), amount: String(initial?.amount ?? initial?.total_amount ?? ""), payment_method: String(initial?.payment_method ?? "cash"), file_url: String(initial?.file_url ?? ""), file_name: String(initial?.file_name ?? (initial?.file_url ? String(initial.file_url).split("/").pop() : "")), file_type: String(initial?.file_type ?? "সংযুক্ত ফাইল"), file_size: String(initial?.file_size ?? "") });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!values.amount || Number(values.amount) <= 0) return setError("সঠিক পরিমাণ লিখুন");
    if (!values.occurred_on) return setError("তারিখ নির্বাচন করুন");
    if (type === "deposit" && (!values.transaction_id || !values.member_id)) return setError("লেনদেন আইডি ও সদস্য নির্বাচন করুন");
    if (type === "expense" && (!values.voucher_no || !values.description)) return setError("ভাউচার নম্বর ও খরচের বিবরণ দিন");
    setBusy(true);
    setError("");
    try {
      let file = { url: values.file_url || null, name: values.file_name || null, type: values.file_type || null, size: values.file_size ? Number.parseInt(values.file_size, 10) || null : null };
      if (pendingFile) {
        const uploaded = await uploadCooperativeFile(pendingFile, type === "deposit" ? "receipts" : "vouchers");
        file = { url: uploaded.url, name: uploaded.compressed.name, type: uploaded.compressed.type || "ফাইল", size: Math.max(1, Math.round(uploaded.compressed.size / 1024)) };
      }
      await onSubmit(type === "deposit" ? { id: values.id || undefined, transaction_id: values.transaction_id.trim(), occurred_on: values.occurred_on, member_id: values.member_id, category: values.category, amount: Number(values.amount), payment_method: values.payment_method, receipt_url: file.url, receipt_name: file.name, receipt_type: file.type, receipt_size: file.size } : { id: values.id || undefined, voucher_no: values.voucher_no.trim(), occurred_on: values.occurred_on, description: values.description.trim(), category: values.category, total_amount: Number(values.amount), voucher_url: file.url, voucher_name: file.name, voucher_type: file.type, voucher_size: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "সংরক্ষণ করা যায়নি");
    } finally {
      setBusy(false);
    }
  };

  return <Dialog open onOpenChange={(open) => !open && !busy && onCancel()}><DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900"><DialogHeader><DialogTitle>{initial ? "এন্ট্রি সম্পাদনা" : type === "deposit" ? "নতুন জমা এন্ট্রি" : "নতুন খরচ এন্ট্রি"}</DialogTitle></DialogHeader><CardContent className="p-0"><form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>{type === "deposit" ? <><div><Label>লেনদেন আইডি</Label><Input required value={values.transaction_id} onChange={(e) => set("transaction_id", e.target.value)} /></div><div><Label>সদস্য</Label><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" required value={values.member_id} onChange={(e) => set("member_id", e.target.value)}><option value="">সদস্য নির্বাচন করুন</option>{members.map((m) => <option key={m.id} value={m.id}>{m.full_name} · {m.member_id}</option>)}</select></div><div><Label>বিভাগ</Label><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={values.category} onChange={(e) => set("category", e.target.value)}><option value="monthly">মাসিক</option><option value="project">প্রকল্প</option><option value="fine">জরিমানা</option></select></div><div><Label>পেমেন্ট মাধ্যম</Label><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={values.payment_method} onChange={(e) => set("payment_method", e.target.value)}><option value="cash">নগদ</option><option value="bkash">বিকাশ</option><option value="bank">ব্যাংক</option></select></div></> : <><div><Label>ভাউচার নম্বর</Label><Input required value={values.voucher_no} onChange={(e) => set("voucher_no", e.target.value)} /></div><div><Label>খরচের বিবরণ</Label><Input required value={values.description} onChange={(e) => set("description", e.target.value)} /></div><div><Label>বিভাগ</Label><select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={values.category} onChange={(e) => set("category", e.target.value)}><option value="office">অফিস</option><option value="project">প্রকল্প বিনিয়োগ</option><option value="others">অন্যান্য</option></select></div></>}<div><Label>তারিখ</Label><Input required type="date" value={values.occurred_on} onChange={(e) => set("occurred_on", e.target.value)} /></div><div><Label>পরিমাণ</Label><Input required min="1" step="0.01" type="number" value={values.amount} onChange={(e) => set("amount", e.target.value)} /></div><div className="md:col-span-2"><Label>{type === "deposit" ? "রসিদ" : "বিল/ভাউচার ফাইল"}</Label><Input type="file" accept="image/*,application/pdf" disabled={busy} onChange={(e) => { setPendingFile(e.target.files?.[0] ?? null); setError(""); }} />{pendingFile && <p className="mt-1 text-xs text-amber-700">সংরক্ষণ করুন চাপলে ফাইল আপলোড হবে: {pendingFile.name}</p>}{values.file_url && !pendingFile && <p className="mt-1 text-xs text-emerald-700">বর্তমান ফাইল: <a className="underline" href={values.file_url} target="_blank" rel="noreferrer">ফাইল দেখুন</a> · {values.file_name || "নাম নেই"} · {values.file_type} · {values.file_size || "আকার জানা নেই"} KB</p>}</div>{error && <p className="text-sm text-rose-700 md:col-span-2" role="alert">{error}</p>}<div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={busy}>{busy ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}</Button><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>বাতিল</Button></div></form></CardContent></DialogContent></Dialog>;
}
