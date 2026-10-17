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
  courseCode: { type: String, required: false },
  assessments: { type: [AssessmentSchema], required: false },
  classAverage: { type: Number, required: false },
  overallPercentage: { type: Number, required: true },
  grade: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

GradeSchema.index({ courseName: 1, overallPercentage: -1 });
GradeSchema.index({ courseName: 1, studentId: 1 });
GradeSchema.index({ studentId: 1 });

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
});

SubjectGroupSchema.index(
  { courseName: 1, day: 1, time: 1, teacher: 1 },
  { unique: true },
);
SubjectGroupSchema.index({ studentIds: 1 });

export const SubjectGroup =
  mongoose.models.SubjectGroup ||
  mongoose.model('SubjectGroup', SubjectGroupSchema);
