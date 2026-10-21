# UCP Campus Combined API (Next.js, Vercel-ready)

One server for both clients: the UCP Campus Flutter app (community:
posts, votes, comments, uploads, teachers, SSE) **and** the UCP Live
Grading Chrome extension (grades, leaderboard, timetable, credits,
privacy, OAuth cookies, earn/referral, admin) under `/api/ext/*`.

Community writes carry the student's Horizon portal `session_id`, which
the API re-verifies against Odoo **live on every request**. Author
identity always comes from Odoo's answer — clients can never post, vote
or comment as someone else. The Flutter app holds no database
credentials at all.

Extension routes are a verbatim port of `extention-server` (Express +
MongoDB): same JSON contracts and status codes, so the shipped v2.2.0
extension keeps working with only a base-URL + `/ext` prefix change.
They use MongoDB (`MONGODB_URI`); when it is unset they answer 503
while community routes keep working.

## Endpoints (same contract the app already speaks)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | — | `{ok, time}` |
| GET | `/api/me` | session | echoes verified `{uid, email, name}` |
| GET | `/api/posts?limit=&before=` | optional | newest first; `score` excludes my vote; embedded flat `comments[]`; `before` ISO cursor returns only older posts (infinite scroll) |
| POST | `/api/posts` | required | `{title 1..120, body ≤2000, flair, imageUrl?}` → 201 |
| POST | `/api/posts/:id/vote` | required | `{value: 1\|-1}` sets, `{}` clears |
| GET | `/api/posts/:id/comments` | optional | flat rows, oldest first |
| POST | `/api/posts/:id/comments` | required | `{text 1..2000, parentId?}` (parent must belong to post) → 201 |
| POST | `/api/comments/:id/vote` | required | same contract as post votes |
| POST | `/api/upload` | required | multipart `image` (jpeg/png/webp/gif, ≤5 MB) → 201 `{url, path}` |
| GET | `/api/teachers?dept=&q=&limit=` | — | highest rated first, max 1000 |
| GET | `/api/teachers/:slug` | — | `{teacher, reviews[]}` latest 200 |
| POST | `/api/teachers/:slug/rate` | required | `{grading, leniency, subject 1..5, comment ≤2000}` → 201 `{review, stats}` |
| GET | `/api/stream` | optional | SSE `community-changed` events + `:ping` keepalive |
| POST | `/api/ext/grades/save` | — | extension grade save → 201 (was `/api/save-grades`) |
| GET | `/api/ext/grades/:studentId` | — | all grades for a student |
| GET | `/api/ext/leaderboard?courseName=&studentId=` | — | classmate-scoped ranks; with `studentId`: 402 when broke, deducts 1 |
| POST | `/api/ext/timetable/save` | — | timetable + SubjectGroup rebuild → 201 |
| GET | `/api/ext/timetable` | — | raw timetable dump (array) |
| GET | `/api/ext/students/:id/check` | — | `{exists, hasTimetable, lastTimetableUpdate}` |
| GET | `/api/ext/credits/:studentId` | — | balance (auto-creates 500) |
| POST | `/api/ext/credits/deduct` | — | `{studentId}` → decremented balance |
| GET | `/api/ext/privacy/:studentId` | — | `{hideName, hidePhoto}` |
| POST | `/api/ext/privacy` | — | `{studentId, hideName, hidePhoto}` upsert |
| POST | `/api/ext/cookies/save` | — | OAuth cookie jar (10 MB body) → 201 |
| POST | `/api/ext/earn/generate` | 10/m | `{userId}` → `{shortUrl}` direct claim link |
| GET | `/api/ext/earn/verify/:token?key=` | 30/m | claims credits → `{success, credits}` |
| GET | `/api/ext/earn/credits/:userId` | — | earn balance |
| POST | `/api/ext/admin/login` | — | `{username, password}` → `{token}` (24h) |
| POST | `/api/ext/admin/logout` | — | revoke Bearer token |
| GET | `/api/ext/admin/sessions[ /:id]` | admin | paged cookie sessions (list hides jars) |
| GET | `/api/ext/migrate/bump-credits` | admin | set sub-500 balances to 500 (**now auth-gated; was open**) |
| GET | `/token/:token` | — | glass claim page (calls ext verify) |
| POST | `/api/admin/session` | — | admin UI login → httpOnly cookie (24h) |
| DELETE | `/api/admin/session` | cookie | admin UI logout → clear cookie |
| GET | `/api/ext/admin/session-jar/:id` | cookie | masked jar (names + first 6 chars) for the UI reveal |
| POST | `/api/ext/admin/credits-adjust` | cookie | `{studentId, amount -1000..1000}` grant/revoke |
| GET | `/api/ext/admin/migrate-preview?dry=1` | cookie | bump-credits dry-run, `dry=0` executes |

Extension rate limits mirror the old server (write 30/m, read 60/m,
earn-generate 10/m, earn-verify 30/m — per-instance, same caveat as the
community limiter).

## Admin control panel (`/admin`)

Server-rendered backend console — no build step, no JS framework state.
Login at `/admin/login` (cookie session, httpOnly, 24h). Pages:

| Page | Controls |
|---|---|
| `/admin` | live Mongo + Supabase counts, subsystem status |
| `/admin/grades` | search grades by course/student, privacy flags |
| `/admin/leaderboard` | inspect classmate scoping per course (read-only, no credits touched) |
| `/admin/timetable` | search timetable rows, class-group counts |
| `/admin/cookies` | paged OAuth sessions (**jars hidden in list**); per-row inspect with click-to-reveal masked jar (first 6 chars) |
| `/admin/credits` | top-20 balances, student lookup, grant/revoke ±1000 |
| `/admin/earn` | referral token inventory (active/claimed) |
| `/admin/migrate` | bump-credits dry-run preview + guarded execute |
| `/admin/health` | live Supabase/Mongo/Odoo probes + env presence |

**Production:** set `ADMIN_PASSWORD` env before first boot (overrides the
seeded `admin/admin`; existing users untouched). Security headers
(`nosniff`, `DENY` framing, `no-referrer`, `no-store`) ship on
`/admin/*` via `next.config.js`. Cookie is `httpOnly + SameSite=lax`
(`Secure` in production).

Session travels as header `x-ucp-session` (query `?session_id=` also works).

## Local run

```bash
cp .env.example .env   # fill SUPABASE_URL + SERVICE_ROLE key (+ MONGODB_URI for /api/ext/*)
npm install
npm test               # 35 tests (16 community + 19 ext), no network
npm run dev            # → http://localhost:3000
```

Extension env (optional — ext routes 503 without `MONGODB_URI`):
`MONGODB_URI`, `CREDITS_REWARD=50`, `BASE_URL` (public host, used in
referral links), `CUTY_API_TOKEN`, `CUTY_API_BASE_URL`, `CUTY_TIMEOUT_MS`.

## Extension cutover (client) — DONE

The extension now talks to this same deployment. It needs only a base-URL
+ prefix change (shipped):

- `src/config.js` `API_BASE_URL` → combined host
  (`https://ucp.animezone.me`); same in
  `src/background/cookieCaptureConfig.js` and `popup.js`.
- Prefix every path with `/ext`: `/api/save-grades` →
  `/api/ext/grades/save`, `/api/leaderboard` →
  `/api/ext/leaderboard`, `/api/save-timetable` →
  `/api/ext/timetable/save`, `/api/check-student/:id` →
  `/api/ext/students/:id/check`, `/api/credits/...` →
  `/api/ext/credits/...`, `/api/privacy...` → `/api/ext/privacy...`,
  `/api/cookies/save` → `/api/ext/cookies/save`,
  `/api/earn/...` → `/api/ext/earn/...`.
- Referral links now render as `<host>/token/<token>?key=...`
  (server builds them from `BASE_URL`).
- `manifest.json` host_permissions: the two `gradeserver-rho` /
  `extention-server-two` entries are REPLACED by the combined host
  (`https://ucp.animezone.me/*`). This is required — without the host
  permission Chrome blocks every call to the new backend.
- `homepage_url` and the policy link point at the same host
  (`/policy` is served by this deployment).

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

## Deploy to Heroku (live)

App: `ucp-campus-community` → `https://ucp.animezone.me`
(fallback Heroku URL: `https://ucp-campus-community-a4cdb3821515.herokuapp.com/`)

Files: `Procfile` (`web: npx next start -p $PORT`), `app.json`
(heroku/nodejs, env declarations), `package.json:start`
(`next start -p ${PORT:-3000}`) + `heroku-postbuild`.

```bash
heroku login
heroku create ucp-community-api   # or heroku create for random name
heroku config:set SUPABASE_URL=https://rggrodedmioijwgfkljt.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service_role> \
  ODOO_BASE=https://horizon.ucp.edu.pk CORS_ORIGIN="*" --app ucp-community-api
git push heroku main
curl https://ucp.animezone.me/api/health
# → {"ok":true,...} ; GET /api/me without header → 401
```

Custom domain: `ucp.animezone.me` (`heroku domains:add ucp.animezone.me`,
CNAME → `curved-muskmelon-7lb7bf5so88opw08qeaz4p4m.herokudns.com`,
`heroku certs:auto:enable` — cert issued, auto-renews).

Point Flutter at it:
`flutter build apk --release --dart-define=NODE_API_URL=https://ucp.animezone.me`

## Retired deployments (do not redeploy)

These are **retired** — the whole system now runs on the single Heroku
deployment above. All of them already answer `402 DEPLOYMENT_DISABLED`:

| Deployment | Was | Now |
|---|---|---|
| `gradeserver-rho.vercel.app` | the extension's own Express server (`extention-server/`) | merged into `/api/ext/*` here |
| `extention-server-two.vercel.app` | a second copy of the extension server | merged into `/api/ext/*` here |
| `ucp-community-api.vercel.app` | the community API | merged into this repo |

The old `extention-server/` repository is **retired**: its service code
lives in `lib/ext/*` here and its routes in `app/api/ext/*`. Do not deploy
it again — a second server means a second database view, split rosters and
split leaderboards.

## One backend — the rules

1. **One deployment.** `ucp-campus-community` on Heroku serves the app, the
   extension and the admin panel. `GET /api/health` reports every surface
   it owns (`serves.app`, `serves.extension`, `serves.admin`).
2. **One host for every client.** `https://ucp.animezone.me` — the app's
   `NODE_API_URL` default and the extension's `API_BASE_URL` + manifest
   `host_permissions` must both point here. No second domain, ever.
3. **One identity layer.** `lib/ext/identity.js` (student id + section
   code) is shared by every write and read, so app-only, extension-only
   and dual users land on the same records.
4. **One database.** `MONGODB_URI` on Heroku is the only database.

Deploy + verify in one command:

```bash
npm run deploy          # push to Heroku, wait, hit /api/health
npm run deploy:check    # verify every client points at this host
```

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
