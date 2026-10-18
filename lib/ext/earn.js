/* Earn-token service (referral credits). The third-party URL shortener
 * (Cuty.io) was removed: generate now returns the direct claim link
 * (`<BASE_URL>/token/<token>?key=<accessKey>`) — one less external
 * dependency, one less secret. */

import crypto from 'crypto';
import { RewardToken } from './models-misc.js';
import { COURSE_NAMES } from './constants.js';

export function buildTokenUrl(baseUrl, token, accessKey) {
  const base = (baseUrl || '').replace(/\/+$/, '');
  if (accessKey) {
    return `${base}/token/${token}?key=${encodeURIComponent(accessKey)}`;
  }
  return `${base}/token/${token}`;
}

export function generateAccessKey() {
  return crypto.randomBytes(16).toString('hex');
}

export async function getReusableToken(userId) {
  return RewardToken.findOne({
    userId,
    used: false,
    courseName: COURSE_NAMES.EARN_TOKEN,
    token: { $exists: true, $ne: '' },
  }).sort({ createdAt: -1 });
}

export async function upsertTokenForUser(userId, maxAttempts) {
  const attempts = Number.isFinite(maxAttempts) ? maxAttempts : 3;
  let lastError = null;
  for (let i = 0; i < attempts; i += 1) {
    const token = crypto.randomBytes(32).toString('hex');
    const accessKey = generateAccessKey();
    try {
      return await RewardToken.findOneAndUpdate(
        { userId, courseName: COURSE_NAMES.EARN_TOKEN },
        {
          $set: {
            token,
            accessKey,
            used: false,
            createdAt: new Date(),
            courseName: COURSE_NAMES.EARN_TOKEN,
            overallPercentage: 0,
            grade: 'N/A',
            studentId: userId,
          },
          $unset: { shortUrl: '' },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    } catch (err) {
      lastError = err;
      if (err && err.code === 11000) continue;
      throw err;
    }
  }
  if (lastError) throw lastError;
  throw new Error('Failed to generate a unique token');
}
