import { json } from '@/lib/respond';
import { RewardToken } from '@/lib/ext/models-misc';
import { addCredits } from '@/lib/ext/credits';
import { extDefaults } from '@/lib/ext/constants';
import {
  verifyTokenParamsSchema,
  verifyTokenQuerySchema,
} from '@/lib/ext/schemas2';
import {
  validateParams,
  validateQueryParams,
  extEnvelope,
  extError,
} from '@/lib/ext/validate';
import { extRoute } from '@/lib/ext/route';

export const runtime = 'nodejs';

/* GET /api/ext/earn/verify/:token?key= — was GET /api/earn/verify/:token. */
export async function GET(req, { params }) {
  const { config, origin, response } = await extRoute(req, 'earnVerify', { requireKey: false });
  if (response) return response;
  const ext = extDefaults(config);
  const raw = await params;
  const url = new URL(req.url);
  const pChecked = validateParams(verifyTokenParamsSchema, {
    token: raw.token,
  });
  if (pChecked.response) {
    return json(
      { error: 'Token is required', code: 'VALIDATION_ERROR' },
      { status: 400, origin },
    );
  }
  const qChecked = validateQueryParams(verifyTokenQuerySchema, {
    key: url.searchParams.get('key'),
  });
  if (qChecked.response) {
    return json(
      {
        error: 'Access key is required',
        code: 'ACCESS_KEY_REQUIRED',
      },
      { status: 400, origin },
    );
  }
  try {
    const rewardToken = await RewardToken.findOne({
      token: pChecked.value.token.trim(),
    });
    if (!rewardToken) {
      return json(
        { error: 'Token not found or expired', code: 'TOKEN_NOT_FOUND' },
        { status: 404, origin },
      );
    }
    if (
      !rewardToken.accessKey ||
      rewardToken.accessKey !== qChecked.value.key.trim()
    ) {
      return json(
        {
          error: 'Invalid access key. Please open the short link to claim credits.',
          code: 'ACCESS_KEY_INVALID',
        },
        { status: 403, origin },
      );
    }
    if (rewardToken.used) {
      return json(
        { error: 'Token has already been used', code: 'TOKEN_ALREADY_USED' },
        { status: 400, origin },
      );
    }
    const creditResult = await addCredits(
      rewardToken.userId,
      ext.CREDITS_REWARD,
    );
    rewardToken.used = true;
    await rewardToken.save();
    return json(
      {
        success: true,
        message: 'Credits added successfully',
        credits: creditResult.credits,
      },
      { origin },
    );
  } catch (err) {
    return extError(err, origin);
  }
}
