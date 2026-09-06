import { useMemo, useState } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressUpload } from "@/lib/imageCompression";
import { signInMember, signUpApprovedMember } from "@/lib/supabase";
import { Check, ImagePlus, LogIn, UserPlus } from "lucide-react";

type AuthForm = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  memberId: string;
  country: string;
  countryCode: CountryCode;
  nationalId: string;
  passportNumber: string;
  photoUrl: string;
  photoFile?: File;
};

function readableAuthError(error: unknown) {
  const record = error && typeof error === "object" ? error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown } : null;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : [record?.message, record?.details, record?.hint, record?.code].filter((value) => value != null && String(value).trim()).map(String).join(" · ");
  const lower = message.toLowerCase();
  if (lower.includes("user already registered") || lower.includes("already been registered")) return "এই ইমেইলে আগে থেকেই account আছে। লগইন tab ব্যবহার করুন অথবা Admin-এর কাছে email যাচাই করুন।";
  if (lower.includes("email not confirmed")) return "ইমেইলে পাঠানো confirmation link চাপুন, তারপর লগইন করুন।";
  if (lower.includes("row-level security") || lower.includes("permission denied")) return "এই তথ্য সংরক্ষণের অনুমতি Supabase-এ blocked হয়েছে। Admin policy যাচাই করুন।";
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) return "এই email বা সদস্য ID আগে থেকেই ব্যবহৃত হয়েছে। অন্যটি দিন।";
  if (lower.includes("function") && lower.includes("does not exist")) return "Supabase-এ signup sync function পাওয়া যাচ্ছে না। Database migration সম্পন্ন হয়নি।";
  if (lower.includes("email ও সদস্য id") || lower.includes("অনুমোদন পাওয়া যায়নি")) return "এই email ও সদস্য ID-এর Admin অনুমোদন পাওয়া যায়নি।";
  return message && message !== "[object Object]" ? message : "অনুরোধটি সম্পন্ন করা যায়নি";
}

const countryOptions = getCountries().map((code) => {
  const localeNames = new Intl.DisplayNames(["bn", "en"], { type: "region" });
  return { code, name: localeNames.of(code) ?? code, dialCode: `+${getCountryCallingCode(code)}` };
}).sort((a, b) => a.name.localeCompare(b.name, "bn"));

export default function MemberAuthDialog() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<AuthForm>({ email: "", password: "", fullName: "", phone: "", memberId: "", country: "সংযুক্ত আরব আমিরাত", countryCode: "AE", nationalId: "", passportNumber: "", photoUrl: "" });
  const selectedCountry = useMemo(() => countryOptions.find((country) => country.code === form.countryCode) ?? countryOptions[0], [form.countryCode]);
  const update = <K extends keyof AuthForm>(key: K, value: AuthForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const onPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressUpload(file, "members");
      update("photoFile", compressed);
      update("photoUrl", URL.createObjectURL(compressed));
      setMessage("ছবি সংকুচিত করে প্রস্তুত করা হয়েছে");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ছবি প্রস্তুত করা যায়নি");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "login") {
        await signInMember(form.email, form.password);
        setMessage("লগইন সফল হয়েছে; হিসাব ব্যবস্থাপনায় নেওয়া হচ্ছে");
        window.setTimeout(() => { window.location.assign("/hisab"); }, 150);
      } else {
        if (form.fullName.trim().length < 3 || form.memberId.trim().length < 3) throw new Error("নাম ও সদস্য আইডি সঠিকভাবে দিন");
        const phone = parsePhoneNumberFromString(form.phone.trim(), form.countryCode);
        if (!phone?.isValid()) throw new Error(`সঠিক মোবাইল নম্বর দিন (${selectedCountry.name} ${selectedCountry.dialCode})`);
        if (!form.nationalId.trim() && !form.passportNumber.trim()) throw new Error("জাতীয় পরিচয়পত্র অথবা পাসপোর্ট নম্বরের যেকোনো একটি দিন");
        await signUpApprovedMember({ ...form, phone: phone.number, country: form.country, countryCode: form.countryCode, nationalId: form.nationalId, passportNumber: form.passportNumber });
        setMessage("সাইনআপ সফল হয়েছে; ইমেইল যাচাই করে প্রবেশ করুন");
      }
    } catch (error) {
      setMessage(readableAuthError(error));
    } finally {
      setBusy(false);
    }
  };

  const isPositive = message.includes("সফল") || message.includes("প্রস্তুত") || message.includes("অনুরোধ পাঠানো হয়েছে");
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="member-auth-trigger" size="sm" variant="outline"><LogIn className="mr-2 h-4 w-4" />সদস্য / এডমিন প্রবেশ</Button></DialogTrigger>
    <DialogContent className="member-auth-dialog max-w-md max-h-[90vh] overflow-y-auto bg-white text-left" dir="ltr">
      <DialogHeader><DialogTitle className="font-[Noto_Sans_Bengali] text-xl text-[#122b3e]">{mode === "login" ? "সদস্য / এডমিন লগইন" : "এডমিন অনুমোদিত সদস্য সাইনআপ"}</DialogTitle></DialogHeader>
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-slate-600">এডমিন ও অনুমোদিত সদস্য একই লগইন ফর্ম ব্যবহার করবেন। নতুন সদস্যের অনুরোধ আগে এডমিন প্যানেলে যাবে; অনুমোদনের পরেই account তৈরি হবে।</div>
      <div className="mb-3 grid grid-cols-2 rounded-lg bg-slate-100 p-1"><button type="button" className={`rounded-md px-3 py-2 text-sm ${mode === "login" ? "bg-white font-bold shadow-sm" : "text-slate-500"}`} onClick={() => { setMode("login"); setMessage(""); }}>লগইন</button><button type="button" className={`rounded-md px-3 py-2 text-sm ${mode === "signup" ? "bg-white font-bold shadow-sm" : "text-slate-500"}`} onClick={() => { setMode("signup"); setMessage(""); }}>সাইনআপ</button></div>
      <form className="grid gap-4" onSubmit={submit}>
        {mode === "signup" && <>
          <div><Label>পূর্ণ নাম</Label><Input required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="আপনার পূর্ণ নাম" /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>সদস্য আইডি</Label><Input required value={form.memberId} onChange={(e) => update("memberId", e.target.value)} placeholder="S-001" /></div><div><Label>দেশ</Label><select required className="h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={form.countryCode} onChange={(e) => { const next = countryOptions.find((country) => country.code === e.target.value); if (next) { update("countryCode", next.code); update("country", next.name); } }}>{countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.dialCode})</option>)}</select></div></div>
          <div><Label>মোবাইল নম্বর</Label><Input required value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder={`যেমন: ${selectedCountry.dialCode} 50 123 4567`} /><p className="mt-1 text-[11px] text-slate-500">দেশের কোড স্বয়ংক্রিয়: {selectedCountry.dialCode}</p></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>জাতীয় পরিচয়পত্র নম্বর</Label><Input value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)} /></div><div><Label>পাসপোর্ট নম্বর</Label><Input value={form.passportNumber} onChange={(e) => update("passportNumber", e.target.value)} /></div></div>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50 p-3"><div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-white text-emerald-700">{form.photoUrl ? <img src={form.photoUrl} alt="সদস্যের ছবি" className="h-full w-full object-cover object-center" /> : <ImagePlus className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><strong className="block text-xs">প্রোফাইল ছবি</strong><span className="block text-[10px] text-slate-500">ছবি সংকুচিত হয়ে নিরাপদে সংরক্ষিত হবে</span></div><label className="cursor-pointer rounded-md bg-white px-2 py-1 text-xs font-bold text-emerald-700">ছবি দিন<input className="hidden" type="file" accept="image/*" onChange={onPhoto} /></label></div>
        </>}
        <div><Label>ইমেইল</Label><Input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="আপনার অনুমোদিত ইমেইল" /></div>
        <div><Label>পাসওয়ার্ড</Label><Input required minLength={6} type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="কমপক্ষে ৬ অক্ষর" /></div>
        {message && <p className={`rounded-md p-3 text-xs ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message}</p>}
        <Button disabled={busy} className="w-full bg-[#092337]" type="submit">{busy ? "অপেক্ষা করুন…" : mode === "login" ? <><LogIn className="mr-2 h-4 w-4" />নিরাপদে লগইন</> : <><UserPlus className="mr-2 h-4 w-4" />সাইনআপের অনুরোধ পাঠান</>}</Button>
        <p className="text-center text-[11px] leading-5 text-slate-500">শুধু অনুমোদিত সদস্যই account তৈরি করতে পারবেন। Admin অনুমোদন ও role Supabase-এর সদস্য তালিকা থেকে নির্ধারিত হয়।</p>
      </form>
    </DialogContent>
  </Dialog>;
}

export { countryOptions };
