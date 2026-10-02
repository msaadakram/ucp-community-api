# UCP Campus Community API (Next.js, Vercel-ready)

Community backend for the UCP Campus Flutter app: posts, votes, nested
comments, photo uploads and a live-update event stream.

Every write carries the student's Horizon portal `session_id`, which the
API re-verifies against Odoo **live on every request**. Author identity
always comes from Odoo's answer — clients can never post, vote or comment
as someone else. The Flutter app holds no database credentials at all.

## Endpoints (same contract the app already speaks)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | — | `{ok, time}` |
| GET | `/api/me` | session | echoes verified `{uid, email, name}` |
| GET | `/api/posts?limit=` | optional | newest first; `score` excludes my vote; embedded flat `comments[]` |
| POST | `/api/posts` | required | `{title 1..120, body ≤2000, flair, imageUrl?}` → 201 |
| POST | `/api/posts/:id/vote` | required | `{value: 1\|-1}` sets, `{}` clears |
| GET | `/api/posts/:id/comments` | optional | flat rows, oldest first |
| POST | `/api/posts/:id/comments` | required | `{text 1..2000, parentId?}` (parent must belong to post) → 201 |
| POST | `/api/comments/:id/vote` | required | same contract as post votes |
| POST | `/api/upload` | required | multipart `image` (jpeg/png/webp/gif, ≤5 MB) → 201 `{url, path}` |
| GET | `/api/stream` | optional | SSE `community-changed` events + `:ping` keepalive |

Session travels as header `x-ucp-session` (query `?session_id=` also works).

## Local run

```bash
cp .env.example .env   # fill SUPABASE_URL + SERVICE_ROLE key
npm install
npm test               # 14 route/auth/upload tests, no network
npm run dev            # → http://localhost:3000
```

## Push to GitHub (new repo)

```bash
cd ucp-community-api
git init -b main
git add -A
git commit -m "feat: community API on Next.js App Router"
# create an EMPTY repo on github.com (no README/license), then:
git remote add origin https://github.com/<you>/ucp-community-api.git
git push -u origin main
```

(If `gh` CLI is logged in: `gh repo create ucp-community-api --public --source=. --push`.)

## Deploy to Vercel

1. **vercel.com → Add New → Project → Import** the repo (framework
   auto-detects Next.js; no Root Directory / build tweaks needed).
2. **Settings → Environment Variables**, add for Production (and Preview):
   - `SUPABASE_URL` = `https://xyzcompany.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbG…` (service_role — server only)
   - `ODOO_BASE` = `https://horizon.ucp.edu.pk`
   - `CORS_ORIGIN` = `*` (pilot) or your exact origins
3. **Deploy.** Open `https://<your-app>.vercel.app/api/health` → `{"ok":true}`.
4. **Verify session gating:** `GET /api/me` without header → `401`.
5. Point the Flutter app at it:
   `flutter build apk --release --dart-define=NODE_API_URL=https://<your-app>.vercel.app`

## Vercel notes (read once)

- **SSE lifetime:** serverless functions cap stream duration, so the app
  auto-reconnects with backoff (already built into the Flutter client) —
  updates may lag seconds on cold instances, never break.
- **Fan-out is per-instance** (in-memory registry): perfect on a warm
  single instance; across scaled-out instances use Upstash Redis pub/sub
  or Supabase Realtime postgres-changes instead of `lib/events.js`.
- **Rate limiting** here is best-effort per instance; Vercel's edge
  absorbs real floods, and auth + validation + upload caps hold everywhere.

## Supabase prerequisites (one-time, in Supabase dashboard)

1. Run `../ucp/supabase/schema.sql` (or copy it here) in SQL Editor.
2. Storage → bucket `community-images`, **Public ON**.
3. Database → Replication → the four `community_*` tables ON (only needed
   if you later switch fan-out to Supabase Realtime).
