import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateMyMemberProfile } from "@/lib/supabase";

type Member = { member_id: string; full_name: string; email?: string | null; phone?: string | null; address?: string | null; photo_url?: string | null; role?: string | null };

export default function MemberProfilePanel({ member, onSaved }: { member: Member; onSaved: (photoUrl: string | null, fullName: string, phone: string, address: string) => void }) {
  const [fullName, setFullName] = useState(member.full_name ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [address, setAddress] = useState(member.address ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const photoUrl = await updateMyMemberProfile({ fullName, phone, address, photoFile: photo, currentPhotoUrl: member.photo_url });
      onSaved(photoUrl, fullName, phone, address);
      setPhoto(null); setMessage("প্রোফাইল সংরক্ষণ হয়েছে");
    } catch (error) { setMessage(error instanceof Error ? error.message : "প্রোফাইল সংরক্ষণ করা যায়নি"); }
    finally { setBusy(false); }
  };
  return <section className="member-profile-panel" aria-label="সদস্যের প্রোফাইল"><div className="member-profile-head"><div className="member-profile-photo">{member.photo_url ? <img src={member.photo_url} alt={`${member.full_name} এর ছবি`} /> : <span>{member.full_name.slice(0, 1)}</span>}</div><div><h2>আমার প্রোফাইল</h2><p>{member.member_id} · {member.role === "admin" ? "এডমিন" : member.role === "moderator" ? "মডারেটর" : "সদস্য"}</p></div></div><form className="grid gap-4" onSubmit={save}><div><Label>পূর্ণ নাম</Label><Input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></div><div><Label>ইমেইল</Label><Input value={member.email ?? ""} readOnly /></div><div><Label>মোবাইল</Label><Input value={phone} onChange={(event) => setPhone(event.target.value)} required /></div><div><Label>ঠিকানা</Label><Textarea value={address} onChange={(event) => setAddress(event.target.value)} /></div><div><Label>প্রোফাইল ছবি</Label><Input type="file" accept="image/*" disabled={busy} onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />{photo && <p className="mt-1 text-xs text-slate-500">নতুন ছবি: {photo.name}</p>}</div>{message && <p className="text-sm text-emerald-700" role="status">{message}</p>}<Button type="submit" disabled={busy}>{busy ? "সংরক্ষণ হচ্ছে…" : "প্রোফাইল সংরক্ষণ করুন"}</Button></form></section>;
}
