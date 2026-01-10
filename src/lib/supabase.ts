import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Check if service role key is available (for server-side operations)
export const isServiceRoleConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

// Create Supabase client (or a dummy client in demo mode)
export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : createClient<Database>('https://placeholder.supabase.co', 'placeholder-key');

// Server-side Supabase client with service role key (bypasses RLS)
// Only use this in API routes, never expose to client
export const supabaseAdmin: SupabaseClient<Database> = isServiceRoleConfigured
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase; // Fallback to regular client if service role not configured

// Create authenticated Supabase client with Firebase ID token
export function createAuthenticatedClient(idToken: string) {
  if (!isSupabaseConfigured) {
    return supabase; // Return dummy client in demo mode
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    },
  });
}
