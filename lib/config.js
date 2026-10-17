/* Shared config: env-driven, validated per request so a missing secret
 * becomes a clear 500 (not a cold-start crash) on serverless. */

export function getConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const odooBase = (
    process.env.ODOO_BASE || 'https://horizon.ucp.edu.pk'
  ).replace(/\/+$/, '');
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  // Extension (Mongo-backed) settings. All optional: when MONGODB_URI is
  // unset, /api/ext/* routes answer 503 while community routes work.
  const mongoUri = (process.env.MONGODB_URI || '').trim();
  // Shared secret for /api/ext/* (the extension ships it). When unset,
  // ext routes fail closed (401) — never public-write.
  const extApiKey = (process.env.EXT_API_KEY || '').trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
  const creditsReward = Number(process.env.CREDITS_REWARD) || 50;
  const cutyToken = (process.env.CUTY_API_TOKEN || '').trim();
  const cutyBase =
    (process.env.CUTY_API_BASE_URL || 'https://cuty.io/api').trim();
  const cutyTimeoutMs = Number(process.env.CUTY_TIMEOUT_MS) || 8000;
  const publicBaseUrl = (process.env.BASE_URL || '').trim();
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      ok: false,
      error:
        'server misconfigured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    };
  }
  return {
    ok: true,
    supabaseUrl,
    supabaseServiceKey,
    odooBase,
    corsOrigin,
    mongoUri,
    extApiKey,
    adminPassword,
    creditsReward,
    cutyToken,
    cutyBase,
    cutyTimeoutMs,
    publicBaseUrl,
  };
}
export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, x-ucp-session, x-api-key, x-admin-request',
    'Access-Control-Max-Age': '86400',
  };
}
