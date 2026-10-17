/* Admin auth service (scrypt, 24h Bearer tokens, cookie sessions).
 *
 * SECURITY: there is NO default password any more. Admin login fails
 * closed until ADMIN_PASSWORD is set (config.adminPassword); when it is
 * set, the stored 'admin' user is created — or re-hashed if an old
 * default/previous password no longer matches — so rotating the env var
 * always takes effect, even against a DB seeded by an older deploy. */

import crypto from 'crypto';
import { getConfig } from '@/lib/config';
import { AdminUser, AdminSession } from './models-misc.js';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_USERNAME = 'admin';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

export function verifyPassword(password, storedHash) {
  const parts = (storedHash || '').split(':');
  if (parts.length !== 2) return false;
  const verifyHash = crypto
    .scryptSync(password, parts[0], 64)
    .toString('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(parts[1], 'hex'),
      Buffer.from(verifyHash, 'hex'),
    );
  } catch (_) {
    return false;
  }
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

/* Creates or repairs the admin user from ADMIN_PASSWORD. Returns the
 * user, or null when no password is configured (login stays closed). */
export async function ensureDefaultAdmin() {
  const { adminPassword } = getConfig();
  if (!adminPassword) return null;
  const existing = await AdminUser.findOne({
    username: DEFAULT_USERNAME,
  });
  if (existing) {
    // Rotate: env password changed (or an old default seed is stored).
    if (!verifyPassword(adminPassword, existing.passwordHash)) {
      existing.passwordHash = hashPassword(adminPassword);
      await existing.save();
    }
    return existing;
  }
  return AdminUser.create({
    username: DEFAULT_USERNAME,
    passwordHash: hashPassword(adminPassword),
    role: 'admin',
  });
}

export async function adminLogin(username, password) {
  const { adminPassword } = getConfig();
  // Fail closed: no ADMIN_PASSWORD => no admin access at all.
  if (!adminPassword) return null;
  await ensureDefaultAdmin();
  const normalized = (username || '').trim().toLowerCase();
  const user = await AdminUser.findOne({ username: normalized });
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await AdminSession.create({ token, username: user.username, expiresAt });
  await AdminUser.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date() } },
  );
  return { token, username: user.username, expiresAt };
}

export async function validateAdminToken(token) {
  if (!token) return null;
  const session = await AdminSession.findOne({
    token,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  return { username: session.username, token: session.token };
}

export async function adminLogout(token) {
  if (!token) return;
  await AdminSession.deleteOne({ token });
}

export function adminTokenFromHeaders(headers) {
  const auth = headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}
