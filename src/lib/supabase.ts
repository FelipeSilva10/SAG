import "server-only";

// Clientes Supabase exclusivos do backend do SAG. A marcação server-only
// impede que a chave service_role entre acidentalmente em um bundle cliente.
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
