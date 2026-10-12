import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ufjvqciyrtpfpetpgavf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

/**
 * Cliente público para o navegador — persiste sessão automaticamente em cookies via @supabase/ssr.
 */
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder'
);

/**
 * Cria uma nova instância do cliente de navegador quando necessário.
 */
export function createSupabaseBrowser() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey || 'placeholder');
}

/**
 * Cliente com privilégios administrativos (service_role) legado para scripts internos.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || 'placeholder',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
