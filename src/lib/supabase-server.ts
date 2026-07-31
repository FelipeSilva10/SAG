// src/lib/supabase-server.ts — APENAS server client
// NUNCA importe em componentes "use client"
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServer() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey?.startsWith("sb_publishable_")) {
    throw new Error("Supabase público não configurado.");
  }

  return createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: any; value: any; options: any; }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* ignorado em Server Components */ }
        },
      },
    }
  );
}
