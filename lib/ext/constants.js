/* Extension constants. Verbatim port of
 * extention-server/config/constants.js (env read lazily per request so
 * Vercel env changes apply without rebuild). */

export const COURSE_NAMES = Object.freeze({
  CREDITS: '__credits__',
  PRIVACY: '__privacy__',
  EARN_USER: '__earn_user__',
  EARN_TOKEN: '__earn_token__',
});

export function extDefaults(config = {}) {
  return Object.freeze({
    CREDITS_DEFAULT: 500,
    CREDITS_REWARD: Number(config.creditsReward) || 50,
    BASE_URL: (config.publicBaseUrl || '').trim() || 'http://localhost:3000',
  });
}
