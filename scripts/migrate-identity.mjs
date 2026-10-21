#!/usr/bin/env node
/* Rebuild the identity layer (roster groups + grade rows) from the raw
 * data written by the app and the extension.
 *
 * WHY: the roster groups were keyed by the raw course NAME string. The
 * portal truncates long course names ("Computer Organization and
 * Assembly ..") and the two clients spell them differently (the app
 * patches the truncated name, the extension keeps it), so the same class
 * ended up in TWO groups and one class = two rosters. Grades were keyed
 * by name too, so a lab/theory naming difference could split a student's
 * marks across two boards.
 *
 * WHAT: groups are re-keyed by "<section>|<day>|<time>" (the section is
 * identical in every client), grade rows get their section identity
 * stamped and duplicates for the same student+section are merged, and
 * student ids are normalized.
 *
 * USAGE:
 *   MONGODB_URI=... node scripts/migrate-identity.mjs [--dry-run]
 */

import mongoose from 'mongoose';

const DRY = process.argv.includes('--dry-run');

const identity = await import('../lib/ext/identity.js');
const { canonicalCourseKey } = await import('../lib/ext/course-key.js');

const {
  normalizeStudentId,
  normalizeSectionCode,
  sectionCourseCode,
  isFullSectionCode,
  groupKeyFor,
  sectionOfName,
} = identity;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const grades = db.collection('grades');
  const timetables = db.collection('timetables');
  const groups = db.collection('subjectgroups');

  // ---------------------------------------------------------------- 1/4
  // Rebuild the roster groups from the timetable rows.
  const rows = await timetables.find({}).toArray();
  const legacyGroups = await groups.find({}).toArray();
  const canonical = new Map(); // groupKey -> {members:Set, courseName, day, time, teacher}

  // Keep the FIRST spelling seen for a group as its display name.
  function mergeInto(key, info, members) {
    if (!key) return;
    if (!canonical.has(key)) {
      canonical.set(key, {
        members: new Set(),
        courseName: info.courseName,
        day: info.day,
        time: info.time,
        teacher: info.teacher,
        sectionKey: info.sectionKey,
        courseKey: canonicalCourseKey(info.courseName),
      });
    }
    const target = canonical.get(key);
    for (const m of members) target.members.add(m);
  }

  let renamedStudents = 0;
  for (const row of rows) {
    const sid = normalizeStudentId(row.studentID);
    if (sid !== row.studentID) renamedStudents++;
    const sectionKey = normalizeSectionCode(sectionOfName(row.courseName));
    const key = groupKeyFor(row.courseName, row.day, row.time, sectionKey);
    mergeInto(
      key,
      {
        courseName: row.courseName,
        day: row.day,
        time: row.time,
        teacher: row.teacher,
        sectionKey,
      },
      [sid],
    );
  }

  // Existing groups carry enrollments made from GRADES (a student who
  // published marks but never posted a timetable). Those memberships must
  // survive the rebuild, and legacy groups keyed by a truncated course
  // name must land on the SAME canonical key as the app's rows.
  let mergedLegacyGroups = 0;
  for (const g of legacyGroups) {
    const sectionKey =
      normalizeSectionCode(g.sectionKey) || normalizeSectionCode(sectionOfName(g.courseName));
    const key = groupKeyFor(g.courseName, g.day, g.time, sectionKey);
    if (!key) continue;
    const members = (g.studentIds || []).map(normalizeStudentId);
    mergeInto(
      key,
      {
        courseName: g.courseName,
        day: g.day,
        time: g.time,
        teacher: g.teacher,
        sectionKey,
      },
      members,
    );
    mergedLegacyGroups++;
  }
  console.log(
    `timetable rows: ${rows.length} | legacy groups: ${mergedLegacyGroups} ` +
      `| canonical groups: ${canonical.size} ` +
      `| student ids normalized: ${renamedStudents}`,
  );

  if (!DRY) {
    // Replace every group with the canonical set.
    const keep = new Set();
    for (const [key, g] of canonical) {
      const doc = {
        courseName: g.courseName,
        day: g.day,
        time: g.time,
        teacher: g.teacher || '',
        studentIds: [...g.members],
        groupKey: key,
        sectionKey: g.sectionKey,
        courseKey: g.courseKey,
      };
      const res = await groups.findOneAndUpdate(
        { groupKey: key },
        { $set: doc },
        { upsert: true, new: true },
      );
      if (res && res._id) keep.add(String(res._id));
    }
    // Drop legacy (name-keyed) groups and empty ones.
    const removed = await groups.deleteMany({
      $or: [
        { groupKey: { $in: ['', null] } },
        { _id: { $nin: [...keep].map((id) => new mongoose.Types.ObjectId(id)) } },
      ],
    });
    console.log(`groups rewritten, legacy/empty removed: ${removed.deletedCount}`);
  }

  // ---------------------------------------------------------------- 2/4
  // Normalize student ids + stamp the section identity on grade rows.
  const gradeDocs = await grades.find({}).toArray();
  let stamped = 0;
  let idFixed = 0;
  const byStudentSection = new Map(); // "SID|SECTION" -> doc
  const duplicates = [];

  for (const doc of gradeDocs) {
    const isCredits = String(doc.courseName || '').startsWith('__');
    const sid = isCredits ? doc.studentId : normalizeStudentId(doc.studentId);
    if (!isCredits && sid !== doc.studentId) idFixed++;
    const code = normalizeSectionCode(doc.courseCode);
    const sectionKey = isCredits ? '' : code;
    const courseCodeKey = isCredits ? '' : sectionCourseCode(code);
    if (!isCredits && (doc.sectionKey !== sectionKey || doc.courseCodeKey !== courseCodeKey)) {
      stamped++;
    }
    const patch = {};
    if (!isCredits) {
      patch.studentId = sid;
      patch.sectionKey = sectionKey;
      patch.courseCodeKey = courseCodeKey;
      if (!doc.courseKey) patch.courseKey = canonicalCourseKey(doc.courseName);
    }
    if (Object.keys(patch).length) {
      if (!DRY) await grades.updateOne({ _id: doc._id }, { $set: patch });
    }
    if (isCredits) continue;
    // Identity for duplicate detection: the section when known, else the
    // course key.
    const ident = sectionKey && isFullSectionCode(sectionKey)
      ? `${sid}|${sectionKey}`
      : `${sid}|${canonicalCourseKey(doc.courseName)}`;
    const prev = byStudentSection.get(ident);
    if (!prev) {
      byStudentSection.set(ident, { doc, ident });
      continue;
    }
    // Keep the better row, delete the other.
    const keepBetter =
      (doc.overallPercentage || 0) > (prev.doc.overallPercentage || 0) ? doc : prev.doc;
    const drop = keepBetter._id === doc._id ? prev.doc : doc;
    byStudentSection.set(ident, { doc: keepBetter, ident });
    duplicates.push(drop);
  }
  console.log(
    `grade rows: ${gradeDocs.length} | section stamped: ${stamped} | ` +
      `student ids normalized: ${idFixed} | duplicate rows merged: ${duplicates.length}`,
  );
  if (!DRY && duplicates.length) {
    await grades.deleteMany({ _id: { $in: duplicates.map((d) => d._id) } });
  }

  // ---------------------------------------------------------------- 3/4
  // Normalize the student ids inside the timetable rows and the groups.
  if (!DRY) {
    const rawRows = await timetables.find({}).toArray();
    for (const row of rawRows) {
      const sid = normalizeStudentId(row.studentID);
      if (sid !== row.studentID) {
        await timetables.updateOne({ _id: row._id }, { $set: { studentID: sid } });
      }
    }
    const rawGroups = await groups.find({}).toArray();
    for (const g of rawGroups) {
      const ids = (g.studentIds || []).map(normalizeStudentId);
      const changed = ids.some((id, i) => id !== (g.studentIds || [])[i]);
      if (changed) {
        await groups.updateOne({ _id: g._id }, { $set: { studentIds: ids } });
      }
    }
  }

  // ---------------------------------------------------------------- 4/4
  const finalGroups = await groups.countDocuments();
  const finalGrades = await grades.countDocuments({ courseName: { $ne: '__credits__' } });
  console.log(`done (dry=${DRY}): groups=${finalGroups} gradeRows=${finalGrades}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('migration failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
