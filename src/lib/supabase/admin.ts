// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error("CRITICAL SECURITY ERROR: O módulo de administração do Supabase jamais pode ser executado no navegador.");
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ufjvqciyrtpfpetpgavf.supabase.co";

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey && process.env.NODE_ENV !== "test") {
  console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY não configurada. Operações de admin falharão.");
}

/**
 * Cliente com privilégios de service_role (isolado estritamente no servidor).
 */
export function createSupabaseAdmin() {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está configurada no ambiente.");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Instância singleton para uso em Server Actions, Webhooks e Cron jobs internos.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || "missing_service_key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
