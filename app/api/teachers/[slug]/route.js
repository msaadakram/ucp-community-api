import { getConfig } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { json, fail, needConfig } from '@/lib/respond';
import { cleanSlug, shapeTeacher, shapeReview } from '@/lib/teachers';

export const runtime = 'nodejs';

/* GET /api/teachers/:slug — teacher + latest reviews. */
export async function GET(req, { params }) {
  const config = getConfig();
  const bad = needConfig(config);
  if (bad) return bad;
  const { slug: raw } = await params;
  const slug = cleanSlug(raw);
  if (!slug) {
    return fail('bad teacher slug', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  try {
    const db = getSupabase(config);
    const { data: t, error: tErr } = await db
      .from('teachers')
      .select('*')
      .eq('slug', slug)
      .single();
    if (tErr || !t) {
      return fail('teacher not found', {
        status: 404,
        origin: config.corsOrigin,
      });
    }
    const { data: revs, error: rErr } = await db
      .from('teacher_reviews')
      .select('*')
      .eq('teacher_slug', slug)
      .order('created_at', { ascending: false })
      .limit(200);
    if (rErr) throw rErr;
    return json(
      { teacher: shapeTeacher(t), reviews: revs.map(shapeReview) },
      { origin: config.corsOrigin },
    );
  } catch (err) {
    return fail('teacher unavailable, try again', {
      origin: config.corsOrigin,
    });
  }
}
