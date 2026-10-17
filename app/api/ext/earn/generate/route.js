import { json } from '@/lib/respond';
import { RewardToken } from '@/lib/ext/models-misc';
import { addCredits, getCredits } from '@/lib/ext/credits';
import {
  buildTokenUrl,
  generateAccessKey,
  shortenUrl,
  getReusableToken,
  upsertTokenForUser,
} from '@/lib/ext/earn';
import { extDefaults } from '@/lib/ext/constants';
import { generateTokenSchema } from '@/lib/ext/schemas2';
import { validateBody, extEnvelope, extError } from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* POST /api/ext/earn/generate — was POST /api/earn/generate-token. */
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
      const existingLongUrl = buildTokenUrl(ext.BASE_URL, reusableToken.token, accessKey);
      if (reusableToken.shortUrl) {
        return json(
          { shortUrl: reusableToken.shortUrl, reused: true },
          { origin },
        );
      }
      const shortResult = await shortenUrl(ext, existingLongUrl);
      if (!shortResult.usedCuty) {
        await reusableToken.save();
        return json(
          {
            error: 'Shortener unavailable. Please try again later.',
            code: 'SHORTENER_UNAVAILABLE',
          },
          { status: 503, origin },
        );
      }
      reusableToken.shortUrl = shortResult.shortUrl;
      await reusableToken.save();
      return json({ shortUrl: shortResult.shortUrl, reused: true }, { origin });
    }

    const tokenDoc = await upsertTokenForUser(userId, 3);
    const longUrl = buildTokenUrl(ext.BASE_URL, tokenDoc.token, tokenDoc.accessKey);
    const shortResult = await shortenUrl(ext, longUrl);
    if (!shortResult.usedCuty) {
      await tokenDoc.save();
      return json(
        {
          error: 'Shortener unavailable. Please try again later.',
          code: 'SHORTENER_UNAVAILABLE',
        },
        { status: 503, origin },
      );
    }
    tokenDoc.shortUrl = shortResult.shortUrl;
    await tokenDoc.save();
    return json({ shortUrl: shortResult.shortUrl }, { status: 201, origin });
  } catch (err) {
    return extError(err, origin);
  }
}

export { RewardToken, addCredits, getCredits };
