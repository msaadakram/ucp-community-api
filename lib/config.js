/* Shared config: env-driven, validated per request so a missing secret
 * becomes a clear 500 (not a cold-start crash) on serverless. */

export function getConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const odooBase = (
    process.env.ODOO_BASE || 'https://horizon.ucp.edu.pk'
  ).replace(/\/+$/, '');
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      ok: false,
      error:
        'server misconfigured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    };
  }
  return { ok: true, supabaseUrl, supabaseServiceKey, odooBase, corsOrigin };
}

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-ucp-session',
    'Access-Control-Max-Age': '86400',
  };
}
