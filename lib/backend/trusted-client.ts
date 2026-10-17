import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';
import { dependencyFetch } from './dependency-fetch.mjs';

// Use only after checking actor ownership/roles or through guarded database RPCs.
// The service role bypasses RLS; it must never be exposed to browser code.
export function trustedBackendClient() {
  const config = supabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key) throw new Error('Trusted services are not configured.');

  return createClient(config.url, key, {
    global: { fetch: dependencyFetch },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
