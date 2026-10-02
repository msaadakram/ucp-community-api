/* Supabase admin client (service_role): RLS is bypassed here ON PURPOSE —
 * authorization happens in our own auth helper (verified Odoo portal
 * session), so the database policies stay simple and the app never sees
 * a privileged key. Cached on globalThis for serverless connection reuse. */

import { createClient } from '@supabase/supabase-js';

let cached = globalThis.__ucpSupabase || null;

export function getSupabase(config) {
  if (cached) return cached;
  cached = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  globalThis.__ucpSupabase = cached;
  return cached;
}

/* Test seam. */
export function __setClient(mock) {
  cached = mock;
  globalThis.__ucpSupabase = mock;
}

export function __resetClient() {
  cached = null;
  globalThis.__ucpSupabase = null;
}
