import { getConfig } from '@/lib/config';
import { resolveUser } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { broadcast } from '@/lib/events';
import { json, fail, needConfig, unauthorized } from '@/lib/respond';
import { isUuid, cleanVote } from '@/lib/validate';

export const runtime = 'nodejs';

/* POST /api/posts/:id/vote — {value: 1|-1} sets, {} clears. */
export async function POST(req, { params }) {
  const config = getConfig();
  const bad = needConfig(config);
  if (bad) return bad;
  const user = await resolveUser(config, req);
  if (!user) return unauthorized(config.corsOrigin);
  const { id } = await params;
  if (!isUuid(id)) {
    return fail('bad post id', { status: 400, origin: config.corsOrigin });
  }
  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    body = {};
  }
  const value = cleanVote(body.value);
  if (value === 'invalid') {
    return fail('value must be 1, -1 or omitted', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  try {
    const db = getSupabase(config);
    if (value === null) {
      const { error } = await db
        .from('community_votes')
        .delete()
        .eq('post_id', id)
        .eq('author_email', user.email);
      if (error) throw error;
    } else {
      const { error } = await db.from('community_votes').upsert(
        { post_id: id, author_email: user.email, value },
        { onConflict: 'post_id,author_email' },
      );
      if (error) throw error;
    }
    broadcast();
    return json({ ok: true, value }, { origin: config.corsOrigin });
  } catch (err) {
    return fail('could not save vote, try again', {
      origin: config.corsOrigin,
    });
  }
}
