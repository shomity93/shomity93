import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const isSupabaseConfigured = Boolean(supabase);

export async function subscribeToLedgerChanges(onChange: () => void) {
  if (!supabase) return () => undefined;
  const channel = supabase.channel("সমিতি-হিসাব-খাতা")
    .on("postgres_changes", { event: "*", schema: "public", table: "deposits" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
