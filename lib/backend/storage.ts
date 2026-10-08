import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';
export const castBucket = 'cast-private';
export function trustedStorage() {
  const config = supabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key) throw new Error('Trusted image services are not configured.');
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
