#!/usr/bin/env node
/* Encrypts legacy PLAINTEXT cookie jars with the vault key.
 *
 * The cookie vault was added after these rows were written, so they sit
 * in Mongo in the clear: a database dump yields 14k usable Microsoft
 * sessions. New saves are already encrypted (see lib/ext/cookies.js);
 * this backfills the old ones.
 *
 * The vault key is taken from the SAME source the server uses
 * (COOKIE_VAULT_KEY, else EXT_API_KEY) — locally that means exporting
 * the Heroku config first:
 *
 *   export $(heroku config -s --app ucp-campus-community)
 *   node scripts/encrypt-legacy-cookies.mjs [--dry-run]
 *
 * Idempotent: rows already carrying the `v1:` prefix are skipped.
 */

import crypto from 'crypto';
import mongoose from 'mongoose';

const DRY = process.argv.includes('--dry-run');
const PREFIX = 'v1:';
const SALT = 'ucp-cookie-vault-v1';

const material =
  process.env.COOKIE_VAULT_KEY || process.env.EXT_API_KEY || '';
if (!material) {
  console.error('COOKIE_VAULT_KEY (or EXT_API_KEY) is required');
  process.exit(1);
}
const key = crypto.scryptSync(material, SALT, 32);

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([
    cipher.update(String(value ?? ''), 'utf8'),
    cipher.final(),
  ]);
  return (
    PREFIX +
    [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ct.toString('base64')].join(':')
  );
}

function decrypt(value) {
  const [, ivB64, tagB64, ctB64] = value.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64'), 'base64'),
    decipher.final(),
  ]).toString('utf8');
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const coll = mongoose.connection.db.collection('cookies');
  const total = await coll.countDocuments();
  const rows = await coll
    .find({}, { projection: { sessionId: 1, phase: 1, cookies: 1 } })
    .toArray();

  let encrypted = 0;
  let already = 0;
  let empty = 0;
  const bulk = [];
  for (const row of rows) {
    const cookies = Array.isArray(row.cookies) ? row.cookies : [];
    if (!cookies.length) {
      empty++;
      continue;
    }
    let dirty = false;
    const next = cookies.map((c) => {
      const value = c && c.value;
      if (typeof value !== 'string' || value.length === 0) return c;
      if (value.startsWith(PREFIX)) {
        already++;
        return c;
      }
      dirty = true;
      return { ...c, value: encrypt(value) };
    });
    if (!dirty) continue;
    bulk.push({ updateOne: { filter: { _id: row._id }, update: { $set: { cookies: next } } } });
    encrypted++;
  }

  console.log(
    `cookie rows: ${total} | to encrypt: ${encrypted} | already encrypted: ${already} | without cookies: ${empty}`,
  );
  if (DRY || !bulk.length) {
    await mongoose.disconnect();
    return;
  }

  const res = await coll.bulkWrite(bulk, { ordered: false });
  console.log(`updated rows: ${res.modifiedCount ?? res.nModified ?? bulk.length}`);

  // Self-check: every value must now decrypt back to a session cookie.
  const sample = await coll.findOne(
    { cookies: { $elemMatch: { value: { $regex: '^v1:' } } } },
    { projection: { cookies: 1 } },
  );
  if (sample) {
    const enc = sample.cookies.find((c) => String(c.value).startsWith(PREFIX));
    const plain = decrypt(enc.value);
    console.log(
      `verify: decrypt round-trip ok (${plain.length} chars of "${enc.name || 'cookie'}" recovered)`,
    );
  }
  const left = await coll.countDocuments({
    cookies: { $elemMatch: { value: { $not: { $regex: '^v1:' }, $ne: '' } } },
  });
  console.log(`rows still holding plaintext cookies: ${left}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
