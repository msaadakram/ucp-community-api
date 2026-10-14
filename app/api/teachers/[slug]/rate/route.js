import { getConfig } from '@/lib/config';
import { resolveUser } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { broadcast } from '@/lib/events';
import { json, fail, needConfig, unauthorized } from '@/lib/respond';
import {
  clampRating,
  cleanSlug,
  cleanComment,
  shapeReview,
  recomputeTeacher,
} from '@/lib/teachers';

export const runtime = 'nodejs';

/* POST /api/teachers/:slug/rate {grading, leniency, subject, comment} — auth.
 * Identity always comes from the verified Odoo session, never the client. */
export async function POST(req, { params }) {
  const config = getConfig();
  const bad = needConfig(config);
  if (bad) return bad;
  const user = await resolveUser(config, req);
  if (!user) return unauthorized(config.corsOrigin);
  const { slug: raw } = await params;
  const slug = cleanSlug(raw);
  if (!slug) {
    return fail('bad teacher slug', {
      status: 400,
      origin: config.corsOrigin,
    });
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
  const grading = clampRating(body.grading);
  const leniency = clampRating(body.leniency);
  const subject = clampRating(body.subject);
  const comment = cleanComment(body.comment);
  if (grading === null || leniency === null || subject === null) {
    return fail('grading, leniency, subject must each be 1..5', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  if (comment === null) {
    return fail('comment must be 2000 chars or less', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  try {
    const db = getSupabase(config);
    const { data: exists, error: exErr } = await db
      .from('teachers')
      .select('slug')
      .eq('slug', slug)
      .single();
    if (exErr || !exists) {
      return fail('teacher not found', {
        status: 404,
        origin: config.corsOrigin,
      });
    }
    const { data, error } = await db
      .from('teacher_reviews')
      .insert({
        teacher_slug: slug,
        student_name: user.name || 'student',
        author_email: user.email,
        comment: comment || '',
        rating_grading: grading,
        rating_leniency: leniency,
        rating_subject: subject,
        is_blocked: false,
      })
      .select()
      .single();
    if (error) throw error;
    const stats = await recomputeTeacher(db, slug);
    broadcast();
    return json(
      { review: shapeReview(data), stats },
      { status: 201, origin: config.corsOrigin },
    );
  } catch (err) {
    return fail('could not save rating, try again', {
      origin: config.corsOrigin,
    });
  }
}
