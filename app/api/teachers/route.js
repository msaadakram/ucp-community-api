import { getConfig } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { json, fail, needConfig } from '@/lib/respond';
import { shapeTeacher } from '@/lib/teachers';

export const runtime = 'nodejs';

/* GET /api/teachers?dept=foit&q=usman&limit=1000 — highest rated first. */
export async function GET(req) {
  const config = getConfig();
  const bad = needConfig(config);
  if (bad) return bad;
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '1000', 10) || 1000, 1),
      1000,
    );
    const dept = (url.searchParams.get('dept') || '').trim();
    const q = (url.searchParams.get('q') || '').trim();
    let query = getSupabase(config)
      .from('teachers')
      .select('*')
      .order('overall_rating', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(limit);
    if (dept) query = query.eq('department_code', dept);
    if (q) query = query.ilike('name', `%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    return json(
      { teachers: data.map(shapeTeacher) },
      { origin: config.corsOrigin },
    );
  } catch (err) {
    return fail('teachers unavailable, try again', {
      origin: config.corsOrigin,
    });
  }
}
