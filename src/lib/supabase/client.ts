import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ufjvqciyrtpfpetpgavf.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Cliente público padrão para leituras públicas (respeita RLS de vagas ativas).
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'placeholder');

/**
 * Cliente com privilégios administrativos (service_role) para o servidor MCP executar upsert e gerenciar status.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || 'placeholder', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
