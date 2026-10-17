/* Timetable service. Port of
 * extention-server/services/timetableService.js (transactions when the
 * deployment is a replica set, sequential writes otherwise). */

import mongoose from 'mongoose';
import { Timetable, SubjectGroup } from './models.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

export function sanitizeTimetableEntries(timetable) {
  if (!Array.isArray(timetable)) return [];
  return timetable
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      class: normalizeText(entry.class),
      time: normalizeText(entry.time),
      teacher: normalizeText(entry.teacher),
      courseName: normalizeText(entry.courseName),
      day: normalizeText(entry.day),
      room: normalizeText(entry.room),
    }))
    .filter(
      (entry) =>
        entry.courseName && entry.day && entry.time && entry.teacher,
    );
}

export async function saveTimetable(studentID, rawTimetable) {
  const normalizedStudentId = normalizeText(studentID);
  const normalizedTimetable = sanitizeTimetableEntries(rawTimetable);
  if (!normalizedTimetable.length) {
    throw Object.assign(
      new Error('No valid timetable entries found in payload'),
      { status: 400, code: 'NO_VALID_ENTRIES' },
    );
  }

  let session = null;
  try {
    const supportsTransactions = await deploymentSupportsTransactions();
    if (supportsTransactions) {
      session = await mongoose.startSession();
      session.startTransaction();
      try {
        await rebuildTimetable(
          normalizedStudentId,
          normalizedTimetable,
          session,
        );
        await session.commitTransaction();
      } catch (txError) {
        try {
          await session.abortTransaction();
        } catch (_) {}
        throw txError;
      } finally {
        try {
          await session.endSession();
        } catch (_) {}
      }
    } else {
      await rebuildTimetable(normalizedStudentId, normalizedTimetable, null);
    }
    return { entriesSaved: normalizedTimetable.length };
  } catch (error) {
    if (session) {
      try {
        await session.endSession();
      } catch (_) {}
    }
    throw error;
  }
}

async function deploymentSupportsTransactions() {
  try {
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.command({ serverStatus: 1 });
    return !!(result.repl && result.repl.setName);
  } catch {
    return false;
  }
}

async function rebuildTimetable(studentId, entries, session) {
  const sessionOption = session ? { session } : {};
  await Timetable.deleteMany({ studentID: studentId }, sessionOption);
  const timetableDocs = entries.map((entry) => ({
    ...entry,
    studentID: studentId,
  }));
  await Timetable.insertMany(timetableDocs, sessionOption);
  await SubjectGroup.updateMany(
    { studentIds: studentId },
    { $pull: { studentIds: studentId } },
    sessionOption,
  );
  for (const entry of entries) {
    const { day, time, teacher, courseName } = entry;
    const groupQuery = { courseName, day, time, teacher };
    try {
      await SubjectGroup.findOneAndUpdate(
        groupQuery,
        { $addToSet: { studentIds: studentId } },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          ...sessionOption,
        },
      );
    } catch (groupError) {
      if (groupError && groupError.code === 11000) {
        await SubjectGroup.updateOne(
          groupQuery,
          { $addToSet: { studentIds: studentId } },
          sessionOption,
        );
      } else {
        throw groupError;
      }
    }
  }
}
