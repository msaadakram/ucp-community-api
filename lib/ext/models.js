/* Extension Mongoose models, part 1: Grade, Timetable, SubjectGroup.
 * Verbatim port of extention-server/models/*.js (CJS -> ESM). The
 * `mongoose.models.X ||` guard is REQUIRED for Next.js serverless/HMR. */

import mongoose from 'mongoose';

const AssessmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  totalMarks: { type: Number, required: true },
  obtainedMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  weightage: { type: Number, required: true },
  classAverage: { type: Number, required: false },
});

const GradeSchema = new mongoose.Schema({
  studentId: { type: String, required: false },
  studentName: { type: String, required: false },
  studentImage: { type: String, required: false },
  privacyMode: { type: Boolean, default: false },
  hideName: { type: Boolean, default: false },
  hidePhoto: { type: Boolean, default: false },
  courseName: { type: String, required: true },
  /// Canonical course key (case/section normalized; lab kept distinct):
  /// the single upsert + leaderboard lookup key so extension (UPPERCASE)
  /// and app (title-case) writes converge on ONE doc per student+course.
  courseKey: { type: String, required: false, default: '' },
  courseCode: { type: String, required: false },
  /// FULL section code of the class the marks belong to
  /// ("AR221-R26-BS-CS-S25-C2"). Identical in every client, so it is the
  /// authority on "which section is this" — unlike the course NAME, which
  /// the portal truncates and the clients spell differently.
  sectionKey: { type: String, required: false, default: '' },
  /// Course part of the section code ("AR221") — coarse fallback.
  courseCodeKey: { type: String, required: false, default: '' },
  assessments: { type: [AssessmentSchema], required: false },
  classAverage: { type: Number, required: false },
  overallPercentage: { type: Number, required: true },
  grade: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

GradeSchema.index({ courseName: 1, overallPercentage: -1 });
GradeSchema.index({ courseKey: 1, overallPercentage: -1 });
GradeSchema.index({ courseKey: 1, studentId: 1 });
GradeSchema.index({ studentId: 1 });
GradeSchema.index({ studentId: 1, sectionKey: 1 });
GradeSchema.index({ sectionKey: 1, overallPercentage: -1 });

export const Grade =
  mongoose.models.Grade || mongoose.model('Grade', GradeSchema);

const TimetableSchema = new mongoose.Schema(
  {
    studentID: { type: String, required: true },
    class: { type: String, required: false },
    time: { type: String, required: true },
    teacher: { type: String, required: true },
    courseName: { type: String, required: true },
    day: { type: String, required: true },
    room: { type: String, required: false },
  },
  { strict: false, timestamps: true },
);

TimetableSchema.index({ studentID: 1 });
TimetableSchema.index({ courseName: 1, day: 1, time: 1, teacher: 1 });

export const Timetable =
  mongoose.models.Timetable || mongoose.model('Timetable', TimetableSchema);

const SubjectGroupSchema = new mongoose.Schema({
  courseName: { type: String, required: true },
  day: { type: String, required: true },
  time: { type: String, required: true },
  teacher: { type: String, required: true },
  studentIds: [{ type: String }],
  /// Canonical group identity: "<sectionCode>|<day>|<time>". Built from
  /// the SECTION (never from the course name) so the app and the
  /// extension merge into ONE roster for the same class.
  groupKey: { type: String, required: false, default: '' },
  /// Section code of the class this group belongs to.
  sectionKey: { type: String, required: false, default: '' },
  /// Canonical course name key (display/lookup helper).
  courseKey: { type: String, required: false, default: '' },
});

SubjectGroupSchema.index(
  { courseName: 1, day: 1, time: 1, teacher: 1 },
  { unique: true },
);
SubjectGroupSchema.index({ groupKey: 1 }, { unique: true, sparse: true });
SubjectGroupSchema.index({ studentIds: 1 });
SubjectGroupSchema.index({ sectionKey: 1 });

export const SubjectGroup =
  mongoose.models.SubjectGroup ||
  mongoose.model('SubjectGroup', SubjectGroupSchema);
