/* Extension Mongoose models, part 3: Privacy, EarnUser, RewardToken,
 * AdminUser, AdminSession. Privacy/earn docs share the `grades`
 * collection via sentinel courseNames (Atlas M0 500-collection limit). */

import mongoose from 'mongoose';
import { COURSE_NAMES } from './constants.js';

const PrivacySchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    hideName: { type: Boolean, default: false },
    hidePhoto: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
    courseName: { type: String, default: COURSE_NAMES.PRIVACY },
    overallPercentage: { type: Number, default: 0 },
    grade: { type: String, default: 'N/A' },
  },
  { collection: 'grades', strict: false },
);

PrivacySchema.index(
  { studentId: 1, courseName: 1 },
  { unique: true, sparse: true },
);
PrivacySchema.index({ updatedAt: 1 });

export const Privacy =
  mongoose.models.Privacy || mongoose.model('Privacy', PrivacySchema);

const EarnUserSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    username: { type: String },
    credits: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    courseName: { type: String, default: COURSE_NAMES.EARN_USER },
    overallPercentage: { type: Number, default: 0 },
    grade: { type: String, default: 'N/A' },
  },
  { collection: 'grades', strict: false },
);

EarnUserSchema.index(
  { userId: 1, courseName: 1 },
  { unique: true, sparse: true },
);

export const EarnUser =
  mongoose.models.EarnUser || mongoose.model('EarnUser', EarnUserSchema);

const RewardTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true },
    userId: { type: String, required: true },
    accessKey: { type: String },
    shortUrl: { type: String },
    used: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    courseName: { type: String, default: COURSE_NAMES.EARN_TOKEN },
    overallPercentage: { type: Number, default: 0 },
    grade: { type: String, default: 'N/A' },
  },
  { collection: 'grades', strict: false },
);

RewardTokenSchema.index({ token: 1 }, { unique: true, sparse: true });
RewardTokenSchema.index({ userId: 1, courseName: 1 });
RewardTokenSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 600, sparse: true },
);

export const RewardToken =
  mongoose.models.RewardToken ||
  mongoose.model('RewardToken', RewardTokenSchema);

const AdminUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: null },
});

export const AdminUser =
  mongoose.models.AdminUser ||
  mongoose.model('AdminUser', AdminUserSchema, 'admin_users');

const AdminSessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AdminSession =
  mongoose.models.AdminSession ||
  mongoose.model('AdminSession', AdminSessionSchema, 'admin_sessions');
