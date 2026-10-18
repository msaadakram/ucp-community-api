import { json } from '@/lib/respond';
import {
  buildTokenUrl,
  generateAccessKey,
  getReusableToken,
  upsertTokenForUser,
} from '@/lib/ext/earn';
import { extDefaults } from '@/lib/ext/constants';
import { generateTokenSchema } from '@/lib/ext/schemas2';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* POST /api/ext/earn/generate — referral claim link. The Cuty shortener
 * was removed: this now returns the DIRECT claim URL as `shortUrl`
 * (field name kept so extension UIs need no changes):
 *   `<BASE_URL>/token/<token>?key=<accessKey>`
 * Set BASE_URL on Heroku so links carry the public host. */
export async function POST(req) {
  const { config, origin, response } = await extRoute(req, 'earnGenerate');
  if (response) return response;
  const ext = extDefaults(config);
  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    return json(
      { error: 'Invalid JSON payload', code: 'INVALID_JSON' },
      { status: 400, origin },
    );
  }
  const checked = validateBody(generateTokenSchema, body);
  if (checked.response) {
    return json(
      {
        error: checked.response.details?.[0]?.message || 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: checked.response.details,
      },
      { status: 400, origin },
    );
  }
  const { userId } = checked.value;
  try {
    const reusableToken = await getReusableToken(userId);
    if (reusableToken && reusableToken.token) {
      let accessKey = reusableToken.accessKey;
      if (!accessKey) {
        accessKey = generateAccessKey();
        reusableToken.accessKey = accessKey;
        reusableToken.shortUrl = '';
      }
      await reusableToken.save();
      return json(
        {
          shortUrl: buildTokenUrl(ext.BASE_URL, reusableToken.token, accessKey),
          reused: true,
        },
        { origin },
      );
    }

    const tokenDoc = await upsertTokenForUser(userId, 3);
    return json(
      {
        shortUrl: buildTokenUrl(ext.BASE_URL, tokenDoc.token, tokenDoc.accessKey),
      },
      { status: 201, origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
