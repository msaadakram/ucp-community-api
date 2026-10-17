/* Earn-token service. Port of
 * extention-server/services/earnTokenService.js. Reads Cuty/credit
 * settings from the per-request config snapshot (env may change
 * without rebuild on Vercel). */

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

async function fetchWithTimeout(url, options, timeoutMs) {
  if (typeof fetch !== 'function') throw new Error('fetch unavailable');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || 8000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function shortenUrl(ext, longUrl) {
  if (!ext.CUTY_API_TOKEN) {
    return { shortUrl: longUrl, usedCuty: false, error: 'CUTY_API_TOKEN missing' };
  }
  const apiUrl =
    ext.CUTY_API_BASE_URL +
    '?api=' +
    encodeURIComponent(ext.CUTY_API_TOKEN) +
    '&url=' +
    encodeURIComponent(longUrl);
  try {
    const resp = await fetchWithTimeout(
      apiUrl,
      { method: 'GET' },
      ext.CUTY_TIMEOUT_MS,
    );
    const bodyText = await resp.text();
    let data = null;
    try {
      data = JSON.parse(bodyText);
    } catch (_) {
      data = null;
    }
    if (!resp.ok) {
      return {
        shortUrl: longUrl,
        usedCuty: false,
        error: data && data.message ? data.message : 'Cuty HTTP ' + resp.status,
      };
    }
    if (data && data.status === 'success' && data.shortenedUrl) {
      return { shortUrl: data.shortenedUrl, usedCuty: true };
    }
    if (data && data.status === 'error' && data.message) {
      return { shortUrl: longUrl, usedCuty: false, error: data.message };
    }
    return { shortUrl: longUrl, usedCuty: false, error: 'Invalid Cuty response' };
  } catch (err) {
    const msg =
      err && err.name === 'AbortError'
        ? 'Cuty request timed out'
        : err && err.message;
    return { shortUrl: longUrl, usedCuty: false, error: msg || 'Cuty failed' };
  }
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
