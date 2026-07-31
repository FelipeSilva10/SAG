import "server-only";

// Clientes Supabase exclusivos do backend do SAG. A marcação server-only
// impede que a chave privilegiada entre acidentalmente em um bundle cliente.
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey?.startsWith("sb_secret_")) {
    throw new Error("Supabase server-side não configurado.");
  }

  return createClient(
    supabaseUrl,
    secretKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
