/* Grade service. Port of extention-server/services/gradeService.js.
 * pino dropped (serverless log drains prefer console). */

import mongoose from 'mongoose';
import { Grade, SubjectGroup } from './models.js';
import { getPrivacyMap } from './privacy.js';

export function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  const sanitized = string.replace(/\0/g, '');
  return sanitized.replace(/[.*+\-?^${}()|[\]\\/]/g, '\\$&');
}

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
  const result = await Grade.findOneAndUpdate(
    { courseName: newGradeData.courseName, studentId: newGradeData.studentId },
    newGradeData,
    { upsert: true, new: true, setDefaultsOnInsert: true, ...sessionOption },
  );
  return { shared: result, personal: result };
}

export async function getLeaderboard(courseName, studentId) {
  let studentIds = [];
  if (studentId) {
    const group = await SubjectGroup.findOne({
      courseName: new RegExp(`^${escapeRegex(courseName)}`, 'i'),
      studentIds: studentId,
    });
    if (group && group.studentIds && group.studentIds.length > 0) {
      studentIds = group.studentIds;
    } else {
      studentIds = [studentId];
    }
  }

  const query = { courseName };
  if (studentIds.length > 0) query.studentId = { $in: studentIds };

  const grades = await Grade.find(query)
    .sort({ overallPercentage: -1 })
    .select(
      'studentName studentImage overallPercentage grade studentId assessments timestamp privacyMode hideName hidePhoto',
    );

  const studentIdList = grades.map((g) => g.studentId).filter(Boolean);
  let privacyMap = new Map();
  try {
    privacyMap = await getPrivacyMap(studentIdList);
  } catch (_) {}

  return grades.map((g) => {
    const gradeObj = g.toObject ? g.toObject() : g;
    return applyPrivacyMask(gradeObj, privacyMap.get(gradeObj.studentId));
  });
}
