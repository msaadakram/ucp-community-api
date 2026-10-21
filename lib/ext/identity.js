/* Identity layer for the mixed ecosystem.
 *
 * The UCP community has THREE client populations:
 *   - extension-only  (Chrome extension, scrapes the portal)
 *   - app-only        (Flutter app, reads the portal with its own session)
 *   - both            (uses the app AND the extension)
 *
 * All three must land on the SAME records, otherwise one person is split
 * into two students and one class is split into two rosters. The rules:
 *
 *   studentId  — normalized (trim + upper) so " l1f25bscs0577 " and
 *                "L1F25BSCS0577" are one student.
 *   sectionKey — the FULL section code ("AR221-R26-BS-CS-S25-C2"). It is
 *                identical in every client (it comes from the portal) and
 *                it is the only course identity that survives the portal
 *                truncating long course names ("Computer Organization and
 *                Assembly ..").
 *   groupKey   — section + day + time. Deliberately NOT built from the
 *                course name: the app and the extension spell the same
 *                course differently (one patches the portal's truncated
 *                name, one keeps it), and name-based groups silently
 *                split a class into two rosters.
 */

import { canonicalCourseKey, sectionOf } from './course-key.js';

/// Normalized student identity (trim + collapse spaces + upper case).
export function normalizeStudentId(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/// Normalized section code: "AR221-R26-BS-CS-S25-C2" (no spaces, upper).
export function normalizeSectionCode(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

/// The course part of a section code: "AR221-R26-..." -> "AR221".
export function sectionCourseCode(value) {
  const code = normalizeSectionCode(value);
  if (!code) return '';
  const i = code.indexOf('-');
  return i === -1 ? code : code.slice(0, i);
}

/// True when the code is a FULL section code (course + term + section).
export function isFullSectionCode(value) {
  return normalizeSectionCode(value).includes('-');
}

/// Section code carried by a course NAME: "X (AR221-R26-...)" -> "AR221-...".
export function sectionOfName(name) {
  return normalizeSectionCode(sectionOf(name));
}

/// The section identity of a course, preferring an explicit code.
export function sectionKeyFor(code, name) {
  const explicit = normalizeSectionCode(code);
  if (explicit) return explicit;
  return sectionOfName(name);
}

/// Normalized weekday ("Monday" -> "monday").
export function normalizeDay(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/// Normalized time range ("08:00 - 08:55" -> "08:00-08:55").
export function normalizeTime(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '');
}

/// Roster group identity: section (full code) + day + time.
export function groupKeyFor(courseName, day, time, sectionCode) {
  const section = normalizeSectionCode(sectionCode) || sectionOfName(courseName);
  const base = section || canonicalCourseKey(courseName);
  if (!base) return '';
  return [base, normalizeDay(day), normalizeTime(time)].join('|');
}

/// The course identity used for grade rows: the full section code when
/// known, else the course code, else '' (name-based lookup only).
export function gradeSectionKey(code) {
  const full = normalizeSectionCode(code);
  if (!full) return '';
  return full;
}

/// The course-code identity ("AR221") — coarser, used as a fallback.
export function gradeCourseCodeKey(code) {
  const full = normalizeSectionCode(code);
  if (!full) return '';
  return sectionCourseCode(full);
}
