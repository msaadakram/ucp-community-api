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
import {
  normalizeStudentId,
  normalizeSectionCode,
  sectionCourseCode,
  isFullSectionCode,
} from './identity.js';
import { findRosterGroups } from './roster.js';

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

  // One identity per person across app/extension: the reg. number is
  // normalized so casing/spacing never splits a student in two.
  const studentId = normalizeStudentId(studentID) || 'unknown';
  const rawCode = normalizeSectionCode(courseCode);
  const sectionKey = rawCode;
  const courseCodeKey = sectionCourseCode(rawCode);

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
    // Section identity: the FULL section code is the one value every
    // client agrees on, even when the course NAME is spelled differently
    // (the portal truncates long names).
    sectionKey,
    courseCodeKey,
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
  // Upsert identity, strongest first:
  //   1. the section (student + section) — immune to name differences
  //      between the app and the extension;
  //   2. the course code + course name;
  //   3. the course name alone (last resort, e.g. no code at all).
  // All three collapse onto ONE doc, so a student never ends up with two
  // rows for the same class.
  const filters = [];
  const sectionKey = newGradeData.sectionKey || '';
  const codeKey = newGradeData.courseCodeKey || '';
  if (sectionKey && isFullSectionCode(sectionKey)) {
    filters.push({ studentId: newGradeData.studentId, sectionKey });
  }
  if (codeKey) {
    filters.push({ studentId: newGradeData.studentId, courseCodeKey: codeKey });
  }
  filters.push({ studentId: newGradeData.studentId, courseKey: key });
  const identity =
    filters.length === 1 ? filters[0] : { $or: filters };
  const result = await Grade.findOneAndUpdate(
    identity,
    { ...newGradeData, courseKey: key },
    { upsert: true, new: true, setDefaultsOnInsert: true, ...sessionOption },
  );
  // A saved grade proves this student sits in this class: enroll them into
  // every roster (section slot) matching the course. Without this, a
  // classmate who has grades but never re-posted a timetable is invisible
  // on everyone else's leaderboard.
  await enrollIntoGroups(
    newGradeData.courseName,
    newGradeData.studentId,
    session,
    newGradeData.sectionKey,
  );
  return { shared: result, personal: result };
}

/// Best-effort roster enrollment (never fails the grade save).
async function enrollIntoGroups(courseName, studentId, session, sectionKey) {
  if (!studentId || studentId === 'unknown') return;
  try {
    const sessionOption = session ? { session } : {};
    const key = canonicalCourseKey(courseName);
    if (!key) return;
    // Prefer the SECTION: enrolling by name alone would drop the student
    // into EVERY section of the course (e.g. all Data Structures sections),
    // which is exactly how rosters used to cross-contaminate.
    const section = normalizeSectionCode(sectionKey);
    if (section && isFullSectionCode(section)) {
      const bySection = await SubjectGroup.updateMany(
        { sectionKey: section },
        { $addToSet: { studentIds: studentId } },
        sessionOption,
      );
      if (bySection.modifiedCount || bySection.matchedCount) return;
      // Legacy groups (pre-migration) still carry the code in the name.
      await SubjectGroup.updateMany(
        { courseName: courseSectionCodeFilter(section) },
        { $addToSet: { studentIds: studentId } },
        sessionOption,
      );
      return;
    }
    await SubjectGroup.updateMany(
      {
        $or: [
          { courseKey: key },
          {
            courseName: {
              $regex: `^${escapeRegex(bareCourseName(courseName))}\\s*(\\(|$)`,
              $options: 'i',
            },
          },
        ],
      },
      { $addToSet: { studentIds: studentId } },
      sessionOption,
    );
  } catch (_) {
    // Enrollment is a best-effort enrichment, not a write barrier.
  }
}

export async function getLeaderboard(courseName, studentId, courseCode) {
  const courseKey = canonicalCourseKey(courseName);
  // The section scopes everything: theory and lab sections share the
  // course name and are only told apart by their code (AR221 vs AR223).
  // A FULL section code ("AR221-R26-BS-CS-S25-C2") is exact; a short
  // course code ("AR221") only narrows the roster, never the marks.
  const requested = normalizeSectionCode(courseCode);
  const fullSection = isFullSectionCode(requested) ? requested : '';
  const codeRe = courseSectionCodeFilter(requested);
  const sectionFilter = codeRe
    ? { courseName: codeRe }
    : courseNameVariantsFilter(courseName);
  let studentIds = [];
  if (studentId) {
    // ALL groups containing this student (one per weekly slot/section they
    // attend) are unioned. Using findOne() picked an ARBITRARY group —
    // often another section's — which made the board look empty.
    // Roster groups of this section (exact section first, then the
    // section code inside the name, then the course-name variants).
    const groups = await findRosterGroups({
      courseName,
      courseCode: requested,
      studentId,
      select: 'studentIds',
    });
    const ids = new Set();
    for (const g of groups) {
      for (const id of g.studentIds || []) ids.add(id);
    }
    // Section-mates by courseCode: grades carry the section code
    // ("CP233-R26-BS-SE-F24-SED1"), so classmates who published marks
    // but never synced a timetable are still found.
    const mine = await Grade.findOne(
      fullSection
        ? { sectionKey: fullSection, studentId }
        : { courseKey, studentId },
    )
      .select('courseCode')
      .lean();
    // The requested code wins (the client knows which section it opened);
    // otherwise fall back to the code stored on the student's own row.
    const myCode = requested
      || (mine && mine.courseCode ? normalizeSectionCode(mine.courseCode) : '');
    if (myCode) {
      // Section-mates by section identity: the exact section when we have
      // it, otherwise the code prefix (the app used to publish the short
      // "AR221" while the extension published "AR221-R26-BS-CS-S25-C2").
      const peers = fullSection
        ? await Grade.find({ sectionKey: fullSection })
            .select('studentId')
            .lean()
        : await Grade.find({
            courseKey,
            courseCode: new RegExp(`^${escapeRegex(myCode)}($|-)`, 'i'),
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

  // Marks are scoped by the SECTION when the client sends a full section
  // code (that is immune to the course name being spelled differently by
  // the app and the extension), and by the canonical course key otherwise.
  const scoped = {};
  if (fullSection) scoped.sectionKey = fullSection;
  else scoped.courseKey = courseKey;
  if (studentIds.length > 0) scoped.studentId = { $in: studentIds };

  let grades = await Grade.find(scoped)
    .sort({ overallPercentage: -1 })
    .select(
      'studentName studentImage overallPercentage grade studentId assessments timestamp privacyMode hideName hidePhoto courseKey sectionKey courseCode',
    )
    .lean();

  if (!grades.length && fullSection) {
    // Legacy rows without a section key — fall back to the course key so
    // an old record is never invisible.
    const fallback = { courseKey };
    if (studentIds.length > 0) fallback.studentId = { $in: studentIds };
    grades = await Grade.find(fallback)
      .sort({ overallPercentage: -1 })
      .select(
        'studentName studentImage overallPercentage grade studentId assessments timestamp privacyMode hideName hidePhoto courseKey sectionKey courseCode',
      )
      .lean();
  }

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
