import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan las credenciales de Supabase en el archivo .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Cliente admin con service_role para operaciones que necesitan bypass RLS (ej: registro de tenant)
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl || '', serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : supabase;
