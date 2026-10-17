/* Security tests for the ext hardening: API-key gate, CSRF guard, and
 * the fail-closed admin login (no default password any more). Offline:
 * Mongo models are mocked with tiny in-memory stores. */

import crypto from 'crypto';

jest.mock('../lib/ext/models-misc', () => {
  const users = new Map();
  const sessions = new Map();
  // Mongoose-like: stored records carry save() which persists mutations.
  const putter = (store) => (rec) => {
    rec.save = async () => {
      store.set(rec.username || rec.token, rec);
      return rec;
    };
    store.set(rec.username || rec.token, rec);
    return rec;
  };
  const makeModel = (store, putOne) => ({
    findOne: async (q) => store.get(q.username || q.token) || null,
    create: async (doc) => putOne({ ...doc }),
    updateOne: async () => ({ acknowledged: true }),
    deleteOne: async (q) => {
      store.delete(q.token);
      return { acknowledged: true };
    },
  });
  return {
    AdminUser: makeModel(users, putter(users)),
    AdminSession: makeModel(sessions, putter(sessions)),
    RewardToken: {},
    __stores: { users, sessions },
    __putUser: putter(users),
  };
});

import { AdminUser, AdminSession, __stores, __putUser } from '../lib/ext/models-misc';
import { hashPassword, verifyPassword, adminLogin } from '../lib/ext/admin';
import { extApiKeyOk, requireSameOrigin } from '../lib/ext/route';

function fakeReq({ key, site, adminHeader } = {}) {
  const headers = new Map();
  if (key !== undefined) headers.set('x-api-key', key);
  if (site !== undefined) headers.set('sec-fetch-site', site);
  if (adminHeader !== undefined) headers.set('x-admin-request', adminHeader);
  return { headers: { get: (k) => headers.get(k) || null } };
}

// getConfig() requires these or it answers { ok: false } with no fields.
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('ext API-key gate', () => {
  test('constant-time key match, mismatch and missing all fail', () => {
    const config = { extApiKey: 'secret-key-1' };
    expect(extApiKeyOk(fakeReq({ key: 'secret-key-1' }), config)).toBe(true);
    expect(extApiKeyOk(fakeReq({ key: 'wrong' }), config)).toBe(false);
    expect(extApiKeyOk(fakeReq({}), config)).toBe(false);
    // Unset key => always false (fail closed).
    expect(extApiKeyOk(fakeReq({ key: 'x' }), { extApiKey: '' })).toBe(false);
  });
});

describe('CSRF guard (requireSameOrigin)', () => {
  test('browser same-origin passes, cross-site fails', () => {
    expect(requireSameOrigin(fakeReq({ site: 'same-origin' }))).toBe(true);
    expect(requireSameOrigin(fakeReq({ site: 'same-site' }))).toBe(true);
    expect(requireSameOrigin(fakeReq({ site: 'cross-site' }))).toBe(false);
  });
  test('non-browser callers can opt in via the custom header', () => {
    expect(requireSameOrigin(fakeReq({ adminHeader: '1' }))).toBe(true);
    expect(requireSameOrigin(fakeReq({}))).toBe(false);
  });
});

describe('admin login is fail-closed without ADMIN_PASSWORD', () => {
  const REAL = process.env.ADMIN_PASSWORD;

  afterEach(() => {
    __stores.users.clear();
    __stores.sessions.clear();
    if (REAL === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = REAL;
  });

  test('no ADMIN_PASSWORD => login always denied, nothing seeded', async () => {
    delete process.env.ADMIN_PASSWORD;
    expect(await adminLogin('admin', 'admin')).toBeNull();
    expect(await adminLogin('admin', 'anything')).toBeNull();
    expect(__stores.users.size).toBe(0);
  });

  test('ADMIN_PASSWORD set => login works and rotates stale hashes', async () => {
    process.env.ADMIN_PASSWORD = 'S3cure!pass';
    // Simulate an old default-seeded user (hash of "admin").
    // Simulate an old default-seeded user (hash of "admin").
    __putUser({
      username: 'admin',
      passwordHash: hashPassword('admin'),
      role: 'admin',
    });
    expect(await adminLogin('admin', 'admin')).toBeNull(); // old pw dead
    expect(await adminLogin('admin', 'S3cure!pass')).not.toBeNull(); // rotated
    // Wrong password still rejected after rotation.
    expect(await adminLogin('admin', 'admin')).toBeNull();
    expect(__stores.sessions.size).toBe(1);
  });
});

describe('hash/verify round-trip', () => {
  test('scrypt pair still verifies (upstream behavior)', () => {
    const h = hashPassword('pw');
    expect(verifyPassword('pw', h)).toBe(true);
    expect(verifyPassword('no', h)).toBe(false);
    expect(verifyPassword('pw', 'garbage')).toBe(false);
  });
});
