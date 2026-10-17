/* Extension merge tests, part 2: mongo guard, rate buckets, helpers.
 * No network, no database. */

import { needMongo } from '@/lib/ext/validate';
import {
  checkRateLimit,
  __resetRateLimits,
  EXT_LIMITS,
  extRateLimitResponse,
} from '@/lib/ratelimit';
import { extEnvelope } from '@/lib/ext/validate';
import { escapeRegex } from '@/lib/ext/grades';
import { sanitizeTimetableEntries } from '@/lib/ext/timetable';
import { buildTokenUrl, generateAccessKey } from '@/lib/ext/earn';
import { hashPassword, verifyPassword } from '@/lib/ext/admin';

const ORIGIN = '*';

beforeEach(() => {
  __resetRateLimits();
  delete process.env.MONGODB_URI;
});

describe('ext mongo guard', () => {
  test('missing MONGODB_URI -> 503, not 500', async () => {
    const res = needMongo({ mongoUri: '', corsOrigin: ORIGIN });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/MONGODB_URI/);
  });

  test('configured mongo -> null (pass)', () => {
    expect(needMongo({ mongoUri: 'mongodb://x', corsOrigin: ORIGIN }))
      .toBeNull();
  });
});

describe('ext rate buckets', () => {
  test('buckets match upstream limits', () => {
    expect(EXT_LIMITS.write).toEqual({ max: 30, windowMs: 60000 });
    expect(EXT_LIMITS.read).toEqual({ max: 60, windowMs: 60000 });
    expect(EXT_LIMITS.earnGenerate).toEqual({ max: 10, windowMs: 60000 });
    expect(EXT_LIMITS.earnVerify).toEqual({ max: 30, windowMs: 60000 });
  });

  test('write bucket trips at 31 and shapes the envelope', () => {
    let last;
    for (let i = 0; i < 31; i++) {
      last = checkRateLimit('ext:write:test', 30, 60000);
    }
    expect(last.allowed).toBe(false);
    const env = extRateLimitResponse(ORIGIN);
    expect(env.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(extEnvelope(env, ORIGIN).status).toBe(429);
  });
});

describe('ext pure helpers', () => {
  test('escapeRegex neutralizes metacharacters', () => {
    expect(escapeRegex('OOP (A+B).*')).toBe('OOP \\(A\\+B\\)\\.\\*');
    expect(escapeRegex(null)).toBe('');
  });

  test('sanitizeTimetableEntries drops incomplete rows', () => {
    const out = sanitizeTimetableEntries([
      { courseName: 'OOP', day: 'Mon', time: '9-10', teacher: 'T', room: 'R' },
      { courseName: '', day: 'Tue', time: '10-11', teacher: 'T' },
      null,
      'nope',
    ]);
    expect(out.length).toBe(1);
    expect(out[0].room).toBe('R');
  });

  test('buildTokenUrl embeds token + key', () => {
    expect(buildTokenUrl('https://x.test/', 'tok', 'key')).toBe(
      'https://x.test/token/tok?key=key',
    );
    expect(buildTokenUrl('https://x.test', 'tok', null)).toBe(
      'https://x.test/token/tok',
    );
  });

  test('access keys are 32 hex chars', () => {
    expect(generateAccessKey()).toMatch(/^[a-f0-9]{32}$/);
  });

  test('scrypt passwords verify and reject', () => {
    const h = hashPassword('admin');
    expect(verifyPassword('admin', h)).toBe(true);
    expect(verifyPassword('wrong', h)).toBe(false);
    expect(verifyPassword('x', 'garbage')).toBe(false);
  });
});
