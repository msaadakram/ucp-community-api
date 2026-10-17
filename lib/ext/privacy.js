/* Privacy service. Port of extention-server/services/privacyService.js. */

import { Privacy } from './models-misc.js';
import { COURSE_NAMES } from './constants.js';

const COURSE = COURSE_NAMES.PRIVACY;

export async function getPrivacy(studentId) {
  const doc = await Privacy.findOne({ studentId, courseName: COURSE }).lean();
  if (!doc) {
    return { studentId, hideName: false, hidePhoto: false, updatedAt: null };
  }
  return {
    studentId: doc.studentId,
    hideName: !!doc.hideName,
    hidePhoto: !!doc.hidePhoto,
    updatedAt: doc.updatedAt || null,
  };
}

export async function setPrivacy(studentId, hideName, hidePhoto) {
  const updatedAt = new Date();
  const doc = await Privacy.findOneAndUpdate(
    { studentId, courseName: COURSE },
    { $set: { hideName: !!hideName, hidePhoto: !!hidePhoto, updatedAt } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return {
    studentId: doc.studentId,
    hideName: !!doc.hideName,
    hidePhoto: !!doc.hidePhoto,
    updatedAt: doc.updatedAt || updatedAt,
  };
}

export async function getPrivacyMap(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return new Map();
  }
  const docs = await Privacy.find({
    studentId: { $in: studentIds },
    courseName: COURSE,
  }).lean();
  const map = new Map();
  docs.forEach((doc) => {
    map.set(doc.studentId, {
      hideName: !!doc.hideName,
      hidePhoto: !!doc.hidePhoto,
    });
  });
  return map;
}
