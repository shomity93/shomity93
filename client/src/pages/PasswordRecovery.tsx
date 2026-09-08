import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, updateMemberPassword } from "@/lib/supabase";

export default function PasswordRecovery() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("ইমেইলের নিরাপদ recovery session যাচাই হচ্ছে…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) { setMessage("সুপাবেস সংযোগ পাওয়া যায়নি"); return; }
    const client = supabase;
    let mounted = true;
    const check = async () => {
      const { data } = await client.auth.getSession();
      if (!mounted) return;
      if (data.session) { setReady(true); setMessage("নতুন পাসওয়ার্ড দিন"); }
      else setMessage("এই recovery link মেয়াদোত্তীর্ণ বা ইতোমধ্যে ব্যবহার করা হয়েছে। আবার password reset করুন।");
    };
    void check();
    const listener = client.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) { setReady(true); setMessage("নতুন পাসওয়ার্ড দিন"); }
    });
    return () => { mounted = false; listener.data.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) { setMessage("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে"); return; }
    if (password !== confirmation) { setMessage("দুইটি পাসওয়ার্ড এক নয়"); return; }
    setBusy(true);
    try {
      await updateMemberPassword(password);
      setMessage("পাসওয়ার্ড পরিবর্তন হয়েছে; হিসাব ড্যাশবোর্ডে নেওয়া হচ্ছে…");
      window.setTimeout(() => window.location.assign("/hisab"), 500);
    } catch (error) { setMessage(error instanceof Error ? error.message : "পাসওয়ার্ড পরিবর্তন করা যায়নি"); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-[#f7f8f5] p-6" dir="ltr"><div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center"><Card className="w-full border-0 shadow-xl"><CardContent className="grid gap-5 p-8"><p className="eyebrow">নিরাপদ সদস্য অঞ্চল</p><h1 className="text-3xl font-bold text-[#092337]">পাসওয়ার্ড পরিবর্তন</h1><p className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">{message}</p>{ready && <form className="grid gap-4" onSubmit={submit}><div><Label>নতুন পাসওয়ার্ড</Label><Input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></div><div><Label>পাসওয়ার্ড আবার লিখুন</Label><Input required minLength={8} type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div><Button disabled={busy} className="bg-[#092337]" type="submit">{busy ? "সংরক্ষণ হচ্ছে…" : "নতুন পাসওয়ার্ড সংরক্ষণ"}</Button></form>}<Button variant="outline" onClick={() => window.location.assign("/")}>হোমে ফিরুন</Button></CardContent></Card></div></div>;
}
