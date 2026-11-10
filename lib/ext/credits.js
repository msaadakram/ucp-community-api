/* Credit service. Port of extention-server/services/creditService.js.
 * Atomic aggregation pipelines on the shared `grades` collection
 * (`courseName: __credits__` sentinel). */

import mongoose from 'mongoose';
import { COURSE_NAMES } from './constants.js';
import { normalizeStudentId } from './identity.js';

const COURSE = COURSE_NAMES.CREDITS;
const CREDITS_DEFAULT = 500;

async function getOrCreate(studentId, creditDefault = CREDITS_DEFAULT) {
  const id = normalizeStudentId(studentId);
  if (!id) throw new Error('studentId is required');
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');
  const coll = db.collection('grades');
  const now = new Date();
  const result = await coll.findOneAndUpdate(
    { studentId: id, courseName: COURSE },
    [
      {
        $set: {
          studentId: id,
          courseName: COURSE,
          overallPercentage: { $ifNull: ['$overallPercentage', 0] },
          grade: { $ifNull: ['$grade', 'N/A'] },
          credits: { $ifNull: ['$credits', creditDefault] },
          timestamp: { $ifNull: ['$timestamp', now] },
        },
      },
    ],
    { upsert: true, returnDocument: 'after', returnOriginal: false },
  );
  const doc = result && result.value ? result.value : result;
  if (!doc) {
    throw new Error('Failed to get or create credit record for ' + studentId);
  }
  return doc;
}

export async function getCredits(studentId) {
  const doc = await getOrCreate(studentId);
  return { studentId: doc.studentId, credits: doc.credits };
}

export async function deductCredit(studentId) {
  const id = normalizeStudentId(studentId);
  const db = mongoose.connection.db;
  const coll = db.collection('grades');
  const now = new Date();
  const result = await coll.findOneAndUpdate(
    { studentId: id, courseName: COURSE },
    [
      {
        $set: {
          studentId: id,
          courseName: COURSE,
          overallPercentage: { $ifNull: ['$overallPercentage', 0] },
          grade: { $ifNull: ['$grade', 'N/A'] },
          credits: {
            $max: [
              0,
              { $subtract: [{ $ifNull: ['$credits', CREDITS_DEFAULT] }, 1] },
            ],
          },
          timestamp: now,
        },
      },
    ],
    { upsert: true, returnDocument: 'after', returnOriginal: false },
  );
  const doc = result && result.value ? result.value : result;
  return { studentId: doc.studentId, credits: doc.credits };
}

export async function addCredits(studentId, amount) {
  const id = normalizeStudentId(studentId);
  const db = mongoose.connection.db;
  const coll = db.collection('grades');
  const now = new Date();
  const result = await coll.findOneAndUpdate(
    { studentId: id, courseName: COURSE },
    [
      {
        $set: {
          studentId: id,
          courseName: COURSE,
          overallPercentage: { $ifNull: ['$overallPercentage', 0] },
          grade: { $ifNull: ['$grade', 'N/A'] },
          credits: {
            $add: [{ $ifNull: ['$credits', CREDITS_DEFAULT] }, amount],
          },
          timestamp: now,
        },
      },
    ],
    { upsert: true, returnDocument: 'after', returnOriginal: false },
  );
  const doc = result && result.value ? result.value : result;
  return { studentId: doc.studentId, credits: doc.credits };
}

/// Atomic admission + deduction for the leaderboard credit gate.
/// Returns { ok, credits } where ok=false means the student is out of
/// credits AND the balance was NOT decremented further (stays 0).
/// Closes the double-spend window: two concurrent calls with 1 credit
/// left → one enters, the other sees a zeroed 'before' and is refused.
export async function admitOrDeductCredit(studentId) {
  const id = normalizeStudentId(studentId);
  if (!id) return { ok: false, credits: 0 };
  const db = mongoose.connection.db;
  const coll = db.collection('grades');
  const now = new Date();
  const before = await coll.findOneAndUpdate(
    { studentId: id, courseName: COURSE },
    [
      {
        $set: {
          studentId: id,
          courseName: COURSE,
          overallPercentage: { $ifNull: ['$overallPercentage', 0] },
          grade: { $ifNull: ['$grade', 'N/A'] },
          credits: {
            $max: [
              0,
              { $subtract: [{ $ifNull: ['$credits', CREDITS_DEFAULT] }, 1] },
            ],
          },
          timestamp: now,
        },
      },
    ],
    { upsert: true, returnDocument: 'before', returnOriginal: true },
  );
  const raw = before && before.value ? before.value : before;
  // No prior record → the upsert creates one (default 500, then -1);
  // that first interaction is always admitted.
  if (!raw) return { ok: true, credits: CREDITS_DEFAULT - 1 };
  if (typeof raw.credits === 'number' && raw.credits <= 0) {
    return { ok: false, credits: 0 };
  }
  return { ok: true, credits: Math.max(0, (raw.credits ?? CREDITS_DEFAULT) - 1) };
}
