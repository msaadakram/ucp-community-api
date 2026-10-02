import { getConfig } from '@/lib/config';
import { resolveUser } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';
import { broadcast } from '@/lib/events';
import { json, fail, needConfig, unauthorized } from '@/lib/respond';

export const runtime = 'nodejs';

const BUCKET = 'community-images';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function extFor(mimetype) {
  return (
    {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }[mimetype] || 'jpg'
  );
}

/* POST /api/upload — multipart `image` -> public URL. No multer needed:
 * App Router parses FormData natively. */
export async function POST(req) {
  const config = getConfig();
  const bad = needConfig(config);
  if (bad) return bad;
  const user = await resolveUser(config, req);
  if (!user) return unauthorized(config.corsOrigin);

  let form;
  try {
    form = await req.formData();
  } catch (_) {
    return fail('multipart form with field "image" required', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  const file = form.get('image');
  if (!file || typeof file.arrayBuffer !== 'function') {
    return fail('field "image" is required', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  const mime = file.type || '';
  if (!ALLOWED.has(mime)) {
    return fail('only jpeg, png, webp or gif images allowed', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    return fail('image must be under 5 MB', {
      status: 400,
      origin: config.corsOrigin,
    });
  }
  try {
    const path =
      `posts/${Date.now()}_${Math.round(Math.random() * 1e9)}.${extFor(mime)}`;
    const db = getSupabase(config);
    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: mime, upsert: false });
    if (error) throw error;
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    broadcast();
    return json(
      { url: data.publicUrl, path },
      { status: 201, origin: config.corsOrigin },
    );
  } catch (err) {
    return fail('upload failed, try again', {
      origin: config.corsOrigin,
    });
  }
}
