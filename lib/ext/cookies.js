/* Cookie service. Port of extention-server/services/cookieService.js,
 * with encryption at rest: cookie values are AES-256-GCM sealed before
 * they reach Mongo (see vault-crypto.js) — a DB dump alone yields no
 * usable sessions, and COOKIE_VAULT_KEY is REQUIRED (no fallback).
 *
 * Retention model (requirement): exactly ONE latest jar per studentId.
 * Every save first deletes all previous jars for that student, then
 * stores the new one. Jars are also TTL'd at 90 days offline. */

import { CookieSession } from './models-cookies.js';
import { normalizeStudentId } from './identity.js';
import { escapeRegex } from './course-key.js';
import {
  encryptCookieList,
  decryptCookieList,
  isVaultConfigured,
} from './vault-crypto.js';

export async function saveCookieSession(payload) {
  if (!isVaultConfigured()) {
    const err = new Error(
      'COOKIE_VAULT_KEY is not set — cookie jars cannot be stored safely.',
    );
    err.status = 503;
    err.code = 'COOKIE_VAULT_UNCONFIGURED';
    throw err;
  }
  const studentId = normalizeStudentId(payload.studentId);
  if (!studentId) {
    const err = new Error('studentId is required');
    err.status = 400;
    err.code = 'STUDENT_ID_REQUIRED';
    throw err;
  }
  // Require explicit consent — anything missing/true-ish is refused.
  if (payload.consent !== true) {
    const err = new Error('consent must be true to store session data');
    err.status = 428;
    err.code = 'CONSENT_REQUIRED';
    throw err;
  }
  const doc = {
    sessionId: payload.sessionId,
    studentId,
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
    consented: true,
    capturedAt: new Date(),
  };

  // EXACTLY ONE jar per student: delete every previous capture for this
  // studentId before storing the new one.
  await CookieSession.deleteMany({ studentId });
  const result = await CookieSession.create(doc);

  return {
    sessionId: result.sessionId,
    phase: result.phase,
    studentId,
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
  if (options.studentId) filter.studentId = new RegExp(escapeRegex(options.studentId), 'i');
  if (options.userName) filter.userName = new RegExp(escapeRegex(options.userName), 'i');
  if (options.userEmail) {
    filter.userEmail = new RegExp(escapeRegex(options.userEmail), 'i');
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

/// Admin maintenance: delete one jar by id (also used for tests).
export async function deleteCookieSession(id) {
  const result = await CookieSession.findByIdAndDelete(id);
  return result != null;
}

/// Wipe every jar (optionally scoped to one student). Destructive —
/// admin UI gates this behind a typed confirmation.
export async function purgeCookieSessions({ studentId } = {}) {
  const filter = studentId
    ? { studentId: normalizeStudentId(studentId) ?? studentId }
    : {};
  const result = await CookieSession.deleteMany(filter);
  return { deleted: result.deletedCount ?? 0 };
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
