/* Admin auth service. Port of
 * extention-server/services/adminAuthService.js (scrypt, 24h Bearer
 * tokens, auto-seeded admin/admin — rotate the password after deploy). */

import crypto from 'crypto';
import { AdminUser, AdminSession } from './models-misc.js';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin';

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

export async function ensureDefaultAdmin() {
  const existing = await AdminUser.findOne({ username: DEFAULT_USERNAME });
  if (existing) return existing;
  return AdminUser.create({
    username: DEFAULT_USERNAME,
    passwordHash: hashPassword(DEFAULT_PASSWORD),
    role: 'admin',
  });
}

export async function adminLogin(username, password) {
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
