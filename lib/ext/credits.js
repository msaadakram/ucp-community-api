/* Credit service. Port of extention-server/services/creditService.js.
 * Atomic aggregation pipelines on the shared `grades` collection
 * (`courseName: __credits__` sentinel). */

import mongoose from 'mongoose';
import { COURSE_NAMES } from './constants.js';

const COURSE = COURSE_NAMES.CREDITS;
const CREDITS_DEFAULT = 500;

async function getOrCreate(studentId, creditDefault = CREDITS_DEFAULT) {
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');
  const coll = db.collection('grades');
  const now = new Date();
  const result = await coll.findOneAndUpdate(
    { studentId, courseName: COURSE },
    [
      {
        $set: {
          studentId,
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
  const db = mongoose.connection.db;
  const coll = db.collection('grades');
  const now = new Date();
  const result = await coll.findOneAndUpdate(
    { studentId, courseName: COURSE },
    [
      {
        $set: {
          studentId,
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
  const db = mongoose.connection.db;
  const coll = db.collection('grades');
  const now = new Date();
  const result = await coll.findOneAndUpdate(
    { studentId, courseName: COURSE },
    [
      {
        $set: {
          studentId,
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
