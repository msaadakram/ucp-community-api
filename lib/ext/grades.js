/* Grade service. Port of extention-server/services/gradeService.js.
 * pino dropped (serverless log drains prefer console). */

import mongoose from 'mongoose';
import { Grade, SubjectGroup } from './models.js';
import { getPrivacyMap } from './privacy.js';
import {
  canonicalCourseKey,
  bareCourseName,
  escapeRegex,
  courseNameFilter,
  courseNameVariantsFilter,
  courseKeyVariants,
  courseSectionCodeFilter,
} from './course-key.js';

// Re-exported for existing importers (ext2.test.js); the implementation
// now lives in course-key.js.
export { escapeRegex } from './course-key.js';

export function enforcePrivacyOnSave(gradeData, privacySetting) {
  if (!gradeData || typeof gradeData !== 'object') return gradeData;
  const shouldHideName = privacySetting
    ? !!privacySetting.hideName
    : !!(gradeData.hideName || gradeData.privacyMode);
  const shouldHidePhoto = privacySetting
    ? !!privacySetting.hidePhoto
    : !!(gradeData.hidePhoto || gradeData.privacyMode);
  gradeData.hideName = !!shouldHideName;
  gradeData.hidePhoto = !!shouldHidePhoto;
  if (shouldHideName) gradeData.studentName = '';
  if (shouldHidePhoto) gradeData.studentImage = '';
  return gradeData;
}

export function applyPrivacyMask(gradeObj, privacyOverride) {
  if (!gradeObj || typeof gradeObj !== 'object') return gradeObj;
  if (gradeObj.studentName) {
    gradeObj.studentName = gradeObj.studentName.split(/Faculty of/i)[0].trim();
  }
  const shouldHideName = privacyOverride
    ? !!privacyOverride.hideName
    : !!(gradeObj.hideName || gradeObj.privacyMode);
  const shouldHidePhoto = privacyOverride
    ? !!privacyOverride.hidePhoto
    : !!(gradeObj.hidePhoto || gradeObj.privacyMode);
  if (shouldHideName) {
    gradeObj.studentName = 'Anonymous';
    gradeObj.studentId = 'hidden';
  }
  if (shouldHidePhoto) gradeObj.studentImage = null;
  return gradeObj;
}

export async function saveGrade(gradeData) {
  const {
    studentID,
    studentName,
    studentImage,
    privacyMode,
    hideName,
    hidePhoto,
    courseName,
    courseCode,
    assessments,
    classAverage,
    overallPercentage,
    grade,
  } = gradeData;

  const studentId = studentID || 'unknown';

  const newGradeData = {
    studentId,
    studentName: studentName || '',
    studentImage: studentImage || '',
    privacyMode: !!privacyMode,
    hideName: !!hideName,
    hidePhoto: !!hidePhoto,
    courseName,
    // Case/section-normalized key: extension (UPPERCASE) and app
    // (title-case) writes converge on ONE doc per student+course.
    courseKey: canonicalCourseKey(courseName),
    courseCode: courseCode || '',
    assessments: assessments || [],
    classAverage: classAverage || 0,
    overallPercentage,
    grade,
    timestamp: new Date(),
  };

  let privacySetting = null;
  try {
    const map = await getPrivacyMap([studentId]);
    privacySetting = map.get(studentId) || null;
  } catch (_) {}

  enforcePrivacyOnSave(newGradeData, privacySetting);

  let session = null;
  let useTransaction = false;
  try {
    if (mongoose.connection.readyState === 1) {
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.command({ hello: 1 });
      const maxWire = result && result.maxWireVersion;
      useTransaction = typeof maxWire === 'number' && maxWire >= 7;
    }
  } catch (_) {
    useTransaction = false;
  }

  if (useTransaction) {
    session = await mongoose.startSession();
    session.startTransaction();
    try {
      const out = await dualWrite(newGradeData, studentId, session);
      await session.commitTransaction();
      return out;
    } catch (err) {
      try {
        await session.abortTransaction();
      } catch (_) {}
      throw err;
    } finally {
      try {
        await session.endSession();
      } catch (_) {}
    }
  }
  return dualWrite(newGradeData, studentId, null);
}

export async function dualWrite(newGradeData, studentId, session) {
  const sessionOption = session ? { session } : {};
  const key = newGradeData.courseKey || canonicalCourseKey(newGradeData.courseName);
  const result = await Grade.findOneAndUpdate(
    // Upsert on the canonical key: same student+course = same doc,
    // whatever case/section format the client sent.
    { courseKey: key, studentId: newGradeData.studentId },
    { ...newGradeData, courseKey: key },
    { upsert: true, new: true, setDefaultsOnInsert: true, ...sessionOption },
  );
  // A saved grade proves this student sits in this class: enroll them into
  // every roster (section slot) matching the course. Without this, a
  // classmate who has grades but never re-posted a timetable is invisible
  // on everyone else's leaderboard.
  await enrollIntoGroups(newGradeData.courseName, newGradeData.studentId, session);
  return { shared: result, personal: result };
}

/// Best-effort roster enrollment (never fails the grade save).
async function enrollIntoGroups(courseName, studentId, session) {
  if (!studentId || studentId === 'unknown') return;
  try {
    const sessionOption = session ? { session } : {};
    const key = canonicalCourseKey(courseName);
    if (!key) return;
    await SubjectGroup.updateMany(
      { courseName: { $regex: `^${escapeRegex(bareCourseName(courseName))}\\s*(\\(|$)`, $options: 'i' } },
      { $addToSet: { studentIds: studentId } },
      sessionOption,
    );
  } catch (_) {
    // Enrollment is a best-effort enrichment, not a write barrier.
  }
}

export async function getLeaderboard(courseName, studentId, courseCode) {
  const courseKey = canonicalCourseKey(courseName);
  // The section code scopes the roster: theory and lab sections share the
  // course name and are only told apart by their code (AR221 vs AR223).
  const codeRe = courseSectionCodeFilter(courseCode);
  const sectionFilter = codeRe
    ? { courseName: codeRe }
    : courseNameVariantsFilter(courseName);
  let studentIds = [];
  if (studentId) {
    // ALL groups containing this student (one per weekly slot/section they
    // attend) are unioned. Using findOne() picked an ARBITRARY group —
    // often another section's — which made the board look empty.
    const groups = await SubjectGroup.find({
      ...sectionFilter,
      studentIds: studentId,
    })
      .select('studentIds')
      .lean();
    const ids = new Set();
    for (const g of groups) {
      for (const id of g.studentIds || []) ids.add(id);
    }
    // Section-mates by courseCode: grades carry the section code
    // ("CP233-R26-BS-SE-F24-SED1"), so classmates who published marks
    // but never synced a timetable are still found.
    const mine = await Grade.findOne({
      courseKey,
      studentId,
    })
      .select('courseCode')
      .lean();
    // The requested code wins (the client knows which section it opened);
    // otherwise fall back to the code stored on the student's own row.
    const myCode = String(courseCode || '').trim()
      || (mine && mine.courseCode ? String(mine.courseCode) : '');
    if (myCode) {
      // Section code match by PREFIX: the app publishes "AR221" while the
      // extension publishes "AR221-R26-BS-CS-S25-C2" — same section.
      const codeRe = new RegExp(`^${escapeRegex(myCode)}($|-)`, 'i');
      const peers = await Grade.find({
        courseKey,
        courseCode: codeRe,
      })
        .select('studentId')
        .lean();
      for (const p of peers) {
        if (p.studentId) ids.add(p.studentId);
      }
    }
    ids.add(studentId);
    studentIds = [...ids];
  }

  // Grades match by canonical key (case/section tolerant) and are scoped
  // by the roster.
  const query = { courseKey };
  if (studentIds.length > 0) query.studentId = { $in: studentIds };

  const grades = await Grade.find(query)
    .sort({ overallPercentage: -1 })
    .select(
      'studentName studentImage overallPercentage grade studentId assessments timestamp privacyMode hideName hidePhoto',
    )
    .lean();

  // Legacy docs (saved before the courseKey upsert) can still carry
  // variant names — the same student must appear once, with their best
  // recorded percentage.
  const byStudent = new Map();
  for (const g of grades) {
    const prev = byStudent.get(g.studentId);
    if (!prev || g.overallPercentage > prev.overallPercentage) {
      byStudent.set(g.studentId, g);
    }
  }
  const ranked = [...byStudent.values()]
    .sort((a, b) => b.overallPercentage - a.overallPercentage);

  const studentIdList = ranked.map((g) => g.studentId).filter(Boolean);
  let privacyMap = new Map();
  try {
    privacyMap = await getPrivacyMap(studentIdList);
  } catch (_) {}

  return ranked.map((g) => {
    const gradeObj = g.toObject ? g.toObject() : g;
    return applyPrivacyMask(gradeObj, privacyMap.get(gradeObj.studentId));
  });
}
