import { getConfig } from '@/lib/config';
import { resolveUser } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { broadcast } from '@/lib/events';
import { json, fail, needConfig, unauthorized } from '@/lib/respond';
import { isUuid, cleanComment } from '@/lib/validate';
import { shapeComment } from '@/lib/validate';

export const runtime = 'nodejs';

/* GET /api/posts/:id/comments — flat thread, oldest first. */
export async function GET(req, { params }) {
  const config = getConfig();
  const bad = needConfig(config);
  if (bad) return bad;
  const { id } = await params;
  if (!isUuid(id)) {
    return fail('bad post id', { status: 400, origin: config.corsOrigin });
  }
  try {
    const user = await resolveUser(config, req);
    const me = user ? user.email : '';
    const db = getSupabase(config);
    const { data: rows, error } = await db
      .from('community_comments')
      .select('*')
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const ids = rows.map((r) => r.id);
    let votes = [];
    if (ids.length) {
      const v = await db
        .from('community_comment_votes')
        .select('comment_id, author_email, value')
        .in('comment_id', ids);
      if (v.error) throw v.error;
      votes = v.data;
    }
    const agg = {};
    for (const v of votes) {
      agg[v.comment_id] = agg[v.comment_id] || { score: 0, mine: 0 };
      const n = Number(v.value) || 0;
      agg[v.comment_id].score += n;
      if (v.author_email === me) agg[v.comment_id].mine = n;
    }
    return json(
      {
        comments: rows.map((r) => {
          const a = agg[r.id] || { score: 0, mine: 0 };
          return shapeComment(r, a.score - a.mine, a.mine);
        }),
      },
      { origin: config.corsOrigin },
    );
  } catch (err) {
    return fail('thread unavailable, try again', {
      origin: config.corsOrigin,
    });
  }
}

/* POST /api/posts/:id/comments — top-level or nested reply. */
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
    return fail('invalid JSON body', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  const text = cleanComment(body.text);
  if (text === null) {
    return fail('text 1..2000 chars required', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  const parentId = body.parentId ?? body.parent_id ?? null;
  if (parentId !== null && !isUuid(parentId)) {
    return fail('bad parent id', { status: 400, origin: config.corsOrigin });
  }
  try {
    const db = getSupabase(config);
    if (parentId) {
      const { data: parent, error: pErr } = await db
        .from('community_comments')
        .select('id, post_id')
        .eq('id', parentId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!parent || parent.post_id !== id) {
        return fail('parent comment is not on this post', {
          status: 400,
          origin: config.corsOrigin,
        });
      }
    }
    const { data, error } = await db
      .from('community_comments')
      .insert({
        post_id: id,
        parent_id: parentId,
        author_email: user.email,
        author_name: user.name,
        text,
      })
      .select()
      .single();
    if (error) throw error;
    broadcast();
    return json(
      { comment: shapeComment(data, 0, 0) },
      { status: 201, origin: config.corsOrigin },
    );
  } catch (err) {
    return fail('could not comment, try again', {
      origin: config.corsOrigin,
    });
  }
}
