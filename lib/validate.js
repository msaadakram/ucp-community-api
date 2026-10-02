/* Shared validation + shaping: reject garbage at the edge so Supabase
 * never sees it; shape rows exactly like the Flutter UI models expect
 * (scores EXCLUDE the viewer's own vote — the app renders score + vote). */

export const FLAIRS = ['Study', 'Events', 'Help', 'Memes', 'Marketplace'];

export function isUuid(v) {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

function cleanText(v, max) {
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(/\s+/g, ' ');
  if (!t || t.length > max) return null;
  return t;
}

export function cleanTitle(v) {
  return cleanText(v, 120);
}

export function cleanBody(v) {
  if (v === undefined || v === null || v === '') return '';
  return cleanText(String(v), 2000);
}

export function cleanComment(v) {
  return cleanText(v, 2000);
}

export function cleanVote(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return n === 1 || n === -1 ? n : 'invalid';
}

export function ageMinutes(iso, nowMs) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((nowMs - t) / 60000));
}

export function timeLabel(ageMin) {
  if (ageMin < 1) return 'now';
  if (ageMin < 60) return `${ageMin}m`;
  const h = Math.floor(ageMin / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function shapePost(row, score, mine, commentCount, comments, nowMs) {
  return {
    id: String(row.id),
    author: row.author_name || 'student',
    flair: row.flair || 'Study',
    title: row.title || '',
    body: row.body || '',
    time: timeLabel(ageMinutes(row.created_at, nowMs)),
    ageMinutes: ageMinutes(row.created_at, nowMs),
    score,
    vote: mine,
    imageUrl: row.image_url || null,
    commentCount,
    comments,
  };
}

export function shapeComment(row, score, mine) {
  return {
    id: String(row.id),
    parent_id: row.parent_id ? String(row.parent_id) : null,
    author: row.author_name || 'student',
    author_name: row.author_name || 'student',
    text: row.text || '',
    created_at: row.created_at,
    score,
    vote: mine,
  };
}
