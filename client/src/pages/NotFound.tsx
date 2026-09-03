import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  return <main className="min-h-screen grid place-items-center bg-[#f8f7f3] p-6" dir="ltr"><Card className="w-full max-w-md border-0 shadow-xl"><CardContent className="p-10 text-center"><div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f2ec] text-[#3c896e]"><AlertCircle /></div><h1 className="text-2xl font-bold text-[#122b3e]">পাতাটি পাওয়া যায়নি</h1><p className="mt-3 text-sm leading-7 text-slate-500">দুঃখিত, আপনি যে ঠিকানাটি খুঁজছেন সেটি আর পাওয়া যাচ্ছে না।</p><Button className="mt-7 bg-[#092337]" onClick={() => navigate("/")}><Home className="mr-2 h-4 w-4" />হোমে ফিরে যান</Button></CardContent></Card></main>;
}
