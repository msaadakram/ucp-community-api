import { getConfig } from '@/lib/config';
import { resolveUser } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { broadcast } from '@/lib/events';
import { json, fail, needConfig, unauthorized, clientIp } from '@/lib/respond';
import { checkRateLimit } from '@/lib/ratelimit';
import {
  FLAIRS,
  cleanTitle,
  cleanBody,
  shapePost,
} from '@/lib/validate';

export const runtime = 'nodejs';

function limited(req, max) {
  const check = checkRateLimit(
    `${clientIp(req)}:posts`,
    max,
    15 * 60 * 1000,
  );
  return check.allowed ? null : check;
}

/* GET /api/posts?limit= — newest first with scores, my votes and full
 * embedded comment threads. Reads are open; pass the session to also get
 * MY votes. */
export async function GET(req) {
  const config = getConfig();
  const bad = needConfig(config);
  if (bad) return bad;
  const limitedRes = limited(req, 300);
  if (limitedRes) {
    return fail('rate limited, try again shortly', {
      status: 429,
      origin: config.corsOrigin,
    });
  }
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '40', 10) || 40, 1),
      100,
    );
    const user = await resolveUser(config, req);
    const me = user ? user.email : '';
    const nowMs = Date.now();
    const db = getSupabase(config);

    const { data: rows, error } = await db
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const ids = rows.map((r) => r.id);

    let votes = [];
    let commentRows = [];
    let commentVotes = [];
    if (ids.length) {
      const v = await db
        .from('community_votes')
        .select('post_id, author_email, value')
        .in('post_id', ids);
      if (v.error) throw v.error;
      votes = v.data;
      const c = await db
        .from('community_comments')
        .select('*')
        .in('post_id', ids)
        .order('created_at', { ascending: true });
      if (c.error) throw c.error;
      commentRows = c.data;
      const cids = commentRows.map((r) => r.id);
      if (cids.length) {
        const cv = await db
          .from('community_comment_votes')
          .select('comment_id, author_email, value')
          .in('comment_id', cids);
        if (cv.error) throw cv.error;
        commentVotes = cv.data;
      }
    }

    const byPost = {};
    for (const v of votes) {
      byPost[v.post_id] = byPost[v.post_id] || { score: 0, mine: 0 };
      const n = Number(v.value) || 0;
      byPost[v.post_id].score += n;
      if (v.author_email === me) byPost[v.post_id].mine = n;
    }
    const commentsByPost = {};
    for (const c of commentRows) {
      (commentsByPost[c.post_id] = commentsByPost[c.post_id] || []).push(c);
    }
    const commentAgg = {};
    for (const v of commentVotes) {
      commentAgg[v.comment_id] = commentAgg[v.comment_id] || {
        score: 0,
        mine: 0,
      };
      const n = Number(v.value) || 0;
      commentAgg[v.comment_id].score += n;
      if (v.author_email === me) commentAgg[v.comment_id].mine = n;
    }

    return json(
      {
        posts: rows.map((r) => {
          const agg = byPost[r.id] || { score: 0, mine: 0 };
          const embedded = (commentsByPost[r.id] || []).map((c) => {
            const a = commentAgg[c.id] || { score: 0, mine: 0 };
            return {
              id: String(c.id),
              parent_id: c.parent_id ? String(c.parent_id) : null,
              author_name: c.author_name || 'student',
              text: c.text || '',
              created_at: c.created_at,
              score: a.score - a.mine,
              vote: a.mine,
            };
          });
          return {
            ...shapePost(r, 0, 0, embedded.length, embedded, nowMs),
            score: agg.score - agg.mine,
            vote: agg.mine,
            comments: embedded,
          };
        }),
      },
      { origin: config.corsOrigin },
    );
  } catch (err) {
    return fail('feed unavailable, try again', {
      origin: config.corsOrigin,
    });
  }
}

/* POST /api/posts — publish (auth required; identity from Odoo session). */
export async function POST(req) {
  const config = getConfig();
  const bad = needConfig(config);
  if (bad) return bad;
  const user = await resolveUser(config, req);
  if (!user) return unauthorized(config.corsOrigin);
  let body = {};
  try {
    body = await req.json();
  } catch (_) {
    return fail('invalid JSON body', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  const title = cleanTitle(body.title);
  const postBody = cleanBody(body.body);
  const flair = body.flair;
  const imageUrl =
    typeof body.imageUrl === 'string'
      ? body.imageUrl.slice(0, 500)
      : typeof body.image_url === 'string'
        ? body.image_url.slice(0, 500)
        : null;
  if (title === null) {
    return fail('title 1..120 chars required', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  if (postBody === null) {
    return fail('body max 2000 chars', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  if (!FLAIRS.includes(flair)) {
    return fail(`flair must be one of ${FLAIRS.join(', ')}`, {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  try {
    const { data, error } = await getSupabase(config)
      .from('community_posts')
      .insert({
        author_email: user.email,
        author_name: user.name,
        title,
        body: postBody,
        flair,
        image_url: imageUrl,
      })
      .select()
      .single();
    if (error) throw error;
    broadcast();
    return json(
      { post: shapePost(data, 0, 0, 0, [], Date.now()) },
      { status: 201, origin: config.corsOrigin },
    );
  } catch (err) {
    return fail('could not publish, try again', {
      origin: config.corsOrigin,
    });
  }
}
