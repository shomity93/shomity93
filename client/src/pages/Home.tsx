import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { uploadCooperativeFile } from "@/lib/cooperativeData";
import { subscribeToLedgerChanges } from "@/lib/supabase";
import { jsPDF } from "jspdf";
import { ArrowLeft, ArrowRight, BarChart3, Check, CircleDollarSign, FileDown, FileText, Gem, Globe2, ImagePlus, Landmark, LogIn, Mail, Menu, Pencil, Plus, Printer, ShieldCheck, Sparkles, Users, WalletCards, X } from "lucide-react";

const heroImages = [
  { src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=85", eyebrow: "আমাদের শক্তি", title: "ঐক্যে গড়ি আগামী দিনের নিরাপদ ভবিষ্যৎ", text: "স্বচ্ছতা, শৃঙ্খলা ও পারস্পরিক সহযোগিতায় সমিতির প্রতিটি সদস্যের স্বপ্নকে আরও কাছে নিয়ে আসি।" },
  { src: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=85", eyebrow: "আমাদের অঙ্গীকার", title: "প্রতিটি সঞ্চয় হোক একটি নতুন সম্ভাবনা", text: "সদস্যদের সঞ্চয় ও অংশগ্রহণকে দায়িত্বশীল ব্যবস্থাপনায় রূপ দিয়ে টেকসই উন্নয়নের পথে এগিয়ে চলি।" },
  { src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=85", eyebrow: "আমাদের পরিবার", title: "আঁরা বি্যাক্কুন এক পরিবার", text: "একসঙ্গে সিদ্ধান্ত, একসঙ্গে অগ্রগতি—সমিতির প্রতিটি সদস্যই আমাদের পরিবারের গুরুত্বপূর্ণ অংশ।" },
];

const depositRows = [
  ["TRX-0048", "আগস্ট ২০২৬", "মোঃ রাকিব হাসান · S-001", "মাসিক", "৳ ২,০০০", "বিকাশ", "রহিম উদ্দিন"],
  ["TRX-0047", "আগস্ট ২০২৬", "ফারজানা আক্তার · S-002", "প্রকল্প", "৳ ৫,০০০", "ব্যাংক", "সাবিনা ইয়াসমিন"],
  ["TRX-0046", "আগস্ট ২০২৬", "শামীম আহমেদ · S-003", "মাসিক", "৳ ২,০০০", "নগদ", "রহিম উদ্দিন"],
  ["TRX-0045", "জুলাই ২০২৬", "মোছাঃ নুসরাত · S-004", "জরিমানা", "৳ ২০০", "নগদ", "সাবিনা ইয়াসমিন"],
];
const expenseRows = [
  ["VCH-0019", "২৮ আগস্ট ২০২৬", "কমিউনিটি সভার নাশতা", "অফিস", "৳ ৩,৮০০", "রহিম উদ্দিন"],
  ["VCH-0018", "২০ আগস্ট ২০২৬", "প্রকল্পের নির্মাণ সামগ্রী", "প্রকল্প বিনিয়োগ", "৳ ১২,৫০০", "রহিম উদ্দিন"],
  ["VCH-0017", "০৮ আগস্ট ২০২৬", "হিসাব খাতা ও স্টেশনারি", "অন্যান্য", "৳ ১,৪৫০", "সাবিনা ইয়াসমিন"],
];

function formatMoney(value: string) { return value; }

function PrintActions({ filename }: { filename: string }) {
  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.text(filename, 14, 16);
    pdf.setFontSize(10);
    pdf.text("সমিতি-নাইন্টি ত্রি · স্বচ্ছ আর্থিক প্রতিবেদন", 14, 23);
    pdf.text(`রপ্তানির তারিখ: ${new Date().toLocaleDateString("bn-BD")}`, 14, 30);
    pdf.text("বিস্তারিত টেবিলসহ A4 সংস্করণের জন্য প্রিন্ট ডায়ালগ থেকে ‘Save as PDF’ নির্বাচন করুন।", 14, 42);
    pdf.save(`${filename}.pdf`);
  };
  return <div className="flex flex-wrap gap-2 print:hidden"><Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />প্রিন্ট</Button><Button size="sm" onClick={exportPdf}><FileDown className="mr-2 h-4 w-4" />পিডিএফ রপ্তানি</Button></div>;
}

function LedgerTable({ type }: { type: "deposit" | "expense" }) {
  const isDeposit = type === "deposit";
  const headers = isDeposit ? ["লেনদেন আইডি", "তারিখ ও মাস", "সদস্যের নাম ও আইডি", "বিভাগ", "পরিমাণ", "পেমেন্ট মাধ্যম", "রসিদ", "প্রবেশকারী"] : ["ভাউচার নং", "তারিখ", "খরচের বিবরণ", "বিভাগ", "মোট পরিমাণ", "বিল/ভাউচার ফাইল", "প্রবেশকারী"];
  const rows = isDeposit ? depositRows : expenseRows;
  return <div className="space-y-4"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">স্বচ্ছ হিসাব</p><h3 className="section-title">{isDeposit ? "জমা খাতা" : "খরচের খাতা"}</h3><p className="muted mt-1">সকল অনুমোদিত সদস্যের জন্য উন্মুক্ত ও হালনাগাদ হিসাব।</p></div><PrintActions filename={isDeposit ? "জমা-খাতা" : "খরচের-খাতা"} /></div><div className="table-shell"><table className="ledger-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell) => <td key={cell}>{cell}</td>)}<td>{isDeposit ? <Button variant="outline" size="sm"><FileText className="mr-1 h-3.5 w-3.5" />দেখুন</Button> : <Button variant="outline" size="sm"><FileText className="mr-1 h-3.5 w-3.5" />দেখুন</Button>}</td>{isDeposit && <td>{row[6]}</td>}</tr>)}</tbody></table></div><div className="flex items-center justify-between text-sm text-slate-500"><span>মোট {rows.length}টি সাম্প্রতিক রেকর্ড</span><Button variant="ghost" size="sm">সব রেকর্ড দেখুন <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [slide, setSlide] = useState(0);
  const [active, setActive] = useState("home");
  const [mobileNav, setMobileNav] = useState(false);
  const [cmsOpen, setCmsOpen] = useState(false);
  const [siteName, setSiteName] = useState("সমিতি-নাইন্টি ত্রি");
  const [tagline, setTagline] = useState("আঁরা বি্যাক্কুন এক পরিবার");
  const [tagline2, setTagline2] = useState("লক্ষ্য অর্জনে প্রতিজ্ঞাবদ্ধ");
  const [contactEmail, setContactEmail] = useState("shomity39@gmial.com");
  const [saved, setSaved] = useState(false);
  const [gallery, setGallery] = useState(heroImages);
  const [liveTick, setLiveTick] = useState(0);

  useEffect(() => { const timer = window.setInterval(() => setSlide((current) => (current + 1) % gallery.length), 5000); return () => window.clearInterval(timer); }, [gallery.length]);
  useEffect(() => { let cleanup: (() => void) | undefined; void subscribeToLedgerChanges(() => setLiveTick((tick) => tick + 1)).then((unsubscribe) => { cleanup = unsubscribe; }); return () => cleanup?.(); }, []);
  const currentHero = gallery[slide] ?? heroImages[0];
  const userLabel = user?.name ?? "অতিথি সদস্য";
  const navItems = [{ id: "home", label: "হোম" }, { id: "about", label: "আমাদের সম্পর্কে" }, { id: "dashboard", label: "ড্যাশবোর্ড" }, { id: "ledgers", label: "হিসাব খাতা" }, { id: "members", label: "সদস্যবৃন্দ" }];
  const summaryCards = useMemo(() => [{ label: "বর্তমান তহবিল", value: "৳ ৪,৮৬,২৫০", change: "+১২.৪%", icon: Landmark, tone: "gold" }, { label: "মোট জমা", value: "৳ ৬,২৪,৮০০", change: "+৮.২%", icon: WalletCards, tone: "blue" }, { label: "মোট খরচ", value: "৳ ১,৩৮,৫৫০", change: "এই বছর", icon: CircleDollarSign, tone: "rose" }, { label: "সক্রিয় সদস্য", value: "৪৮ / ৫০", change: "২টি আসন খালি", icon: Users, tone: "green" }], []);

  const saveCms = () => { setSaved(true); window.setTimeout(() => setSaved(false), 2200); };
  const onGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const uploaded = await uploadCooperativeFile(file, "gallery"); const src = uploaded.url; setGallery((items) => [...items, { src, eyebrow: "নতুন গ্যালারি", title: file.name.replace(/\.[^/.]+$/, ""), text: "অ্যাডমিন প্যানেল থেকে যোগ করা নতুন গ্যালারি কনটেন্ট।" }]); };

  return <div className="site-shell" dir="ltr"><header className="public-nav"><div className="container nav-inner"><a className="brand" href="#home" onClick={() => setActive("home")}><span className="brand-mark"><Gem className="h-5 w-5" /></span><span><strong>{siteName}</strong><small>সমবায়ে সমৃদ্ধি</small></span></a><nav className={`desktop-links ${mobileNav ? "is-open" : ""}`}>{navItems.map((item) => <a key={item.id} className={active === item.id ? "active" : ""} href={`#${item.id}`} onClick={() => { setActive(item.id); setMobileNav(false); }}>{item.label}</a>)}</nav><div className="nav-actions"><Badge className="live-badge"><span />লাইভ আপডেট{liveTick > 0 ? ` · ${liveTick}` : ""}</Badge>{isAuthenticated ? <span className="user-chip">{userLabel}</span> : <Button size="sm" variant="outline" onClick={() => startLogin()}><LogIn className="mr-2 h-4 w-4" />প্রবেশ করুন</Button>}<Button variant="ghost" size="icon" className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>{mobileNav ? <X /> : <Menu />}</Button></div></div></header>

    <main id="home"><section className="hero"><div className="hero-image" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,25,40,.82) 0%, rgba(8,25,40,.58) 42%, rgba(8,25,40,.1) 100%), url(${currentHero.src})` }} /><div className="container hero-content"><div className="hero-copy"><span className="hero-kicker"><Sparkles className="h-4 w-4" /> {currentHero.eyebrow}</span><h1>{currentHero.title}</h1><p>{currentHero.text}</p><div className="hero-ctas"><Button className="cta-primary" onClick={() => setActive("dashboard")}>ড্যাশবোর্ড দেখুন <ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" className="cta-ghost" onClick={() => setActive("about")}>আরও জানুন</Button></div></div><div className="hero-side-note"><span>০{slide + 1}</span><div className="hero-progress"><i style={{ width: `${((slide + 1) / gallery.length) * 100}%` }} /></div><span>০{gallery.length}</span></div></div><div className="hero-controls"><Button variant="ghost" size="icon" onClick={() => setSlide((slide - 1 + gallery.length) % gallery.length)}><ArrowLeft /></Button><Button variant="ghost" size="icon" onClick={() => setSlide((slide + 1) % gallery.length)}><ArrowRight /></Button></div></section>

    <section className="trust-strip"><div className="container trust-inner"><div><ShieldCheck className="h-5 w-5" /><span>স্বচ্ছ হিসাবরক্ষণ</span></div><div><Globe2 className="h-5 w-5" /><span>সবার জন্য উন্মুক্ত</span></div><div><Users className="h-5 w-5" /><span>৪৮ সক্রিয় সদস্য</span></div><div><BarChart3 className="h-5 w-5" /><span>তাৎক্ষণিক আপডেট</span></div></div></section>

    <section id="dashboard" className="section dashboard-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">সমিতির এক নজরে</p><h2>বিশ্বাস তৈরি হয় স্বচ্ছতায়</h2><p className="muted">আমাদের আর্থিক কার্যক্রমের সাম্প্রতিক চিত্র—প্রতিটি সংখ্যাই সদস্যদের সম্মিলিত অবদানের প্রতিফলন।</p></div><div className="heading-actions"><Badge variant="outline" className="as-of">সর্বশেষ: ৩১ আগস্ট ২০২৬</Badge><Button variant="outline" onClick={() => setCmsOpen(!cmsOpen)}><Pencil className="mr-2 h-4 w-4" />অ্যাডমিন প্যানেল</Button></div></div><div className="stat-grid">{summaryCards.map(({ label, value, change, icon: Icon, tone }) => <Card key={label} className={`stat-card tone-${tone}`}><CardContent><div className="stat-icon"><Icon /></div><div><p>{label}</p><h3>{value}</h3><span>{change}</span></div></CardContent></Card>)}</div><div className="dashboard-grid"><Card className="chart-card"><CardHeader><div><CardTitle>তহবিলের গতিপ্রকৃতি</CardTitle><p className="muted">জানুয়ারি – আগস্ট ২০২৬</p></div><Badge variant="outline">মাসিক</Badge></CardHeader><CardContent><div className="bars">{[42, 56, 48, 70, 61, 78, 73, 92].map((height, index) => <div className="bar-item" key={index}><div className="bar" style={{ height: `${height}%` }} /><span>{["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট"][index]}</span></div>)}</div><div className="chart-legend"><span><i className="dot deposits" /> জমা</span><span><i className="dot expenses" /> খরচ</span><strong>নিট বৃদ্ধি <b>+৳ ২৮,৪৫০</b></strong></div></CardContent></Card><Card className="notice-card"><CardHeader><CardTitle>সভাপতির বার্তা</CardTitle><Badge>২০২৬</Badge></CardHeader><CardContent><div className="quote-mark">“</div><p>একটি শক্তিশালী সমিতি গড়ে ওঠে তখনই, যখন প্রতিটি সদস্য জানেন তাঁর অবদান কোথায় যাচ্ছে। আমরা সেই স্বচ্ছতার সংস্কৃতিতে বিশ্বাস করি।</p><div className="sign"><div className="avatar">রউ</div><div><strong>মোঃ রউফুল ইসলাম</strong><span>সভাপতি, সমিতি-নাইন্টি ত্রি</span></div></div></CardContent></Card></div></div></section>

    <section id="ledgers" className="section ledger-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">হিসাবের ডিরেক্টরি</p><h2>সব হিসাব, সবার জন্য</h2><p className="muted">সকল জমা, খরচ ও বার্ষিক সারাংশ এক জায়গায়। ডেটা স্বচ্ছ, যাচাইযোগ্য এবং নিয়মিত হালনাগাদ।</p></div><Button><Plus className="mr-2 h-4 w-4" />নতুন এন্ট্রি</Button></div><Tabs defaultValue="deposits"><TabsList className="ledger-tabs"><TabsTrigger value="deposits">জমা খাতা</TabsTrigger><TabsTrigger value="expenses">খরচের খাতা</TabsTrigger><TabsTrigger value="summary">মাসিক ও বার্ষিক সারাংশ</TabsTrigger></TabsList><TabsContent value="deposits" className="tab-panel"><LedgerTable type="deposit" /></TabsContent><TabsContent value="expenses" className="tab-panel"><LedgerTable type="expense" /></TabsContent><TabsContent value="summary" className="tab-panel"><div className="flex items-end justify-between gap-4 mb-4"><div><p className="eyebrow">আর্থিক প্রতিবেদন</p><h3 className="section-title">মাসিক ও বার্ষিক সারাংশ</h3></div><PrintActions filename="আর্থিক-সারাংশ" /></div><div className="table-shell"><table className="ledger-table"><thead><tr>{["সময়কাল", "প্রারম্ভিক ব্যালেন্স", "মোট জমা", "মোট খরচ", "প্রকল্প বিনিয়োগ", "নিট প্রকল্প আয়", "বর্তমান মোট তহবিল"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody><tr><td>আগস্ট ২০২৬</td><td>৳ ৪,৫৯,৮০০</td><td>৳ ৬২,২০০</td><td>৳ ৩৫,৭৫০</td><td>৳ ১২,৫০০</td><td>৳ ১৪,২০০</td><td><strong>৳ ৪,৮৬,২৫০</strong></td></tr><tr><td>২০২৬ (বার্ষিক)</td><td>৳ ৩,৪০,০০০</td><td>৳ ৪,৮৮,৬০০</td><td>৳ ১,৩৮,৫৫০</td><td>৳ ৮৬,০০০</td><td>৳ ৬৫,০০০</td><td><strong>৳ ৪,৮৬,২৫০</strong></td></tr></tbody></table></div></TabsContent></Tabs></div></section>

    <section id="about" className="section about-section"><div className="container about-grid"><div><p className="eyebrow">আমাদের পরিচয়</p><h2>লক্ষ্য অর্জনে প্রতিজ্ঞাবদ্ধ</h2><p className="lead">{tagline} · {tagline2}—এই বিশ্বাসকে সামনে রেখে সমিতি-নাইন্টি ত্রি সদস্যদের সঞ্চয়, সহযোগিতা ও সম্মিলিত উদ্যোগকে একটি নিরাপদ কাঠামোয় নিয়ে আসে।</p><div className="pillars"><div><span>০১</span><strong>দায়িত্বশীলতা</strong><p>প্রতিটি সিদ্ধান্তে সদস্যদের স্বার্থ অগ্রাধিকার পায়।</p></div><div><span>০২</span><strong>সহযোগিতা</strong><p>সম্মিলিত উদ্যোগেই তৈরি হয় দীর্ঘস্থায়ী পরিবর্তন।</p></div><div><span>০৩</span><strong>স্বচ্ছতা</strong><p>প্রতিটি হিসাব সদস্যদের দেখার ও বোঝার অধিকার রয়েছে।</p></div></div></div><div className="about-card"><div className="about-card-top"><span>২০২৬</span><Gem /></div><h3>একসঙ্গে এগিয়ে চলি</h3><p>আজকের ছোট সঞ্চয়, আগামী দিনের বড় সম্ভাবনা। আমাদের প্রতিটি উদ্যোগ সদস্যদের জীবনে বাস্তব পরিবর্তন আনার লক্ষ্যে পরিচালিত।</p><Button variant="outline">পরিচালনা কমিটি <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div></section>

    <section id="members" className="section members-section"><div className="container"><div className="section-heading"><div><p className="eyebrow">আমাদের পরিবার</p><h2>সদস্যদের সম্মিলিত শক্তি</h2></div><Badge variant="outline">সর্বোচ্চ ৫০ সদস্য</Badge></div><div className="member-row">{["মোঃ রাকিব হাসান", "ফারজানা আক্তার", "শামীম আহমেদ", "মোছাঃ নুসরাত", "আবু বকর সিদ্দিক", "সাবিনা ইয়াসমিন"].map((name, index) => <div className="member-card" key={name}><div className={`member-avatar m-${index}`}>{name.slice(0, 2)}</div><strong>{name}</strong><span>সদস্য · S-00{index + 1}</span></div>)}</div></div></section>
    </main>

    {cmsOpen && <div className="cms-overlay" onClick={() => setCmsOpen(false)}><Card className="cms-panel" onClick={(e) => e.stopPropagation()}><div className="cms-head"><div><p className="eyebrow">অ্যাডমিন CMS</p><h2>সাইট কনটেন্ট সম্পাদনা</h2></div><Button variant="ghost" size="icon" onClick={() => setCmsOpen(false)}><X /></Button></div><div className="cms-form"><div><Label>সমিতির নাম</Label><Input value={siteName} onChange={(e) => setSiteName(e.target.value)} /></div><div><Label>প্রধান ট্যাগলাইন</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} /></div><div><Label>দ্বিতীয় ট্যাগলাইন</Label><Input value={tagline2} onChange={(e) => setTagline2(e.target.value)} /></div><div><Label>যোগাযোগের ইমেইল</Label><Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div><div><Label>সংক্ষিপ্ত পরিচিতি</Label><Textarea defaultValue="সঞ্চয়, সহযোগিতা ও স্বচ্ছতার মাধ্যমে একটি নিরাপদ সম্মিলিত ভবিষ্যৎ গড়ার অঙ্গীকার।" /></div><div className="upload-box"><ImagePlus className="h-5 w-5" /><div><strong>গ্যালারি ছবি যোগ করুন</strong><p>ছবি স্বয়ংক্রিয়ভাবে সংকুচিত হয়ে সংরক্ষিত হবে</p></div><label className="upload-button">ফাইল নির্বাচন<input type="file" accept="image/*" onChange={onGalleryUpload} /></label></div><Button onClick={saveCms} className="w-full">{saved ? <><Check className="mr-2 h-4 w-4" />সংরক্ষিত হয়েছে</> : "পরিবর্তন সংরক্ষণ করুন"}</Button></div></Card></div>}
    <a className="floating-mail" href={`mailto:${contactEmail}`} aria-label="ইমেইলে যোগাযোগ"><Mail /></a><footer><div className="container footer-inner"><div className="brand footer-brand"><span className="brand-mark"><Gem className="h-5 w-5" /></span><span><strong>{siteName}</strong><small>আঁরা বি্যাক্কুন এক পরিবার</small></span></div><p>© ২০২৬ {siteName} · স্বচ্ছতা ও সহযোগিতায় সমৃদ্ধি</p><div className="footer-contact"><Mail className="h-4 w-4" /> {contactEmail}</div></div></footer></div>;
}
