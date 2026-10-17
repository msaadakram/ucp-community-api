/* Bump-credits migration. Port of
 * extention-server/services/bumpCreditsMigration.js.
 * NOTE: was an OPEN GET /migrate/bump-credits. Here it requires the
 * admin Bearer token (hardening on merge — the old server left it open). */

import mongoose from 'mongoose';
import { COURSE_NAMES } from './constants.js';

const CREDITS_COURSE = COURSE_NAMES.CREDITS;
const CREDITS_DEFAULT = 500;

export async function migrateBumpCredits(db) {
  const gradesColl = db.collection('grades');
  const records = await gradesColl
    .find({ courseName: CREDITS_COURSE })
    .toArray();
  const belowThreshold = records.filter(
    (r) => (r.credits || 0) < CREDITS_DEFAULT,
  );

  let bumped = 0;
  for (const r of belowThreshold) {
    await gradesColl.updateOne(
      { _id: r._id },
      { $set: { credits: CREDITS_DEFAULT, timestamp: new Date() } },
    );
    bumped++;
  }

  return {
    total: records.length,
    belowThreshold: belowThreshold.length,
    bumped,
  };
}

export function migrationDb() {
  return mongoose.connection.db || null;
}
