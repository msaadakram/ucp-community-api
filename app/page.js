import Link from 'next/link';

/* Landing page for the ONE backend that serves every UCP client:
 *   - the Android app (community + leaderboard)
 *   - the Chrome extension (/api/ext/*)
 *   - the admin panel
 * Nothing else is deployed: every client talks to this host. */
export const metadata = {
  title: 'UCP Campus — one backend for the app and the extension',
  description:
    'Single Heroku deployment serving the UCP University Android app, the Chrome extension and the community API.',
};

const groups = [
  {
    title: 'Android app',
    items: [
      ['Community API', '/api/posts'],
      ['Teacher reviews', '/api/teachers'],
      ['Health check', '/api/health'],
      ['Student data privacy', '/policy'],
    ],
  },
  {
    title: 'Chrome extension',
    items: [
      ['Save grades', '/api/ext/grades/save'],
      ['Save timetable', '/api/ext/timetable/save'],
      ['Leaderboard', '/api/ext/leaderboard'],
      ['Class roster', '/api/ext/roster'],
      ['Privacy', '/api/ext/privacy'],
      ['Credits', '/api/ext/credits'],
    ],
  },
  {
    title: 'Control panel',
    items: [
      ['Overview', '/admin'],
      ['Session jars', '/admin/cookies'],
      ['Credits', '/admin/credits'],
      ['Health', '/admin/health'],
    ],
  },
];

export default function Home() {
  return (
    <main
      style={{
        fontFamily:
          "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        background:
          'radial-gradient(1200px 600px at 80% -10%, rgba(23, 137, 184, 0.18), transparent 60%), #0b1116',
        color: '#e9eef5',
        minHeight: '100vh',
        padding: '32px 24px 64px',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        {/* Top bar */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '10px 4px 26px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="#1789B8" />
              <path
                d="M8 18.5h3.2v-5L15 19V9.5h3.2v9h3L14 21z"
                fill="#FFFFFF"
                opacity="0.95"
              />
            </svg>
            <strong style={{ fontSize: 17, letterSpacing: '-0.01em' }}>
              UCP&nbsp;Campus
            </strong>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <Link href="#api" style={{ color: '#a9bccf', textDecoration: 'none', fontSize: 14 }}>
              API
            </Link>
            <Link href="/policy" style={{ color: '#a9bccf', textDecoration: 'none', fontSize: 14 }}>
              Privacy
            </Link>
            <Link
              href="/admin"
              style={{
                color: '#0b1116',
                background: '#F4A82A',
                borderRadius: 10,
                padding: '7px 14px',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Control panel
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <header
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
            gap: 32,
            alignItems: 'center',
            padding: '48px 0 28px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(23,137,184,0.12)',
                border: '1px solid rgba(23,137,184,0.35)',
                borderRadius: 999,
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#7fd4f0',
                marginBottom: 18,
              }}
            >
              ONE HOST · EVERY CLIENT
            </div>
            <h1
              style={{
                fontSize: 'clamp(30px, 5vw, 46px)',
                lineHeight: 1.08,
                margin: '0 0 16px',
                letterSpacing: '-0.03em',
                fontWeight: 800,
              }}
            >
              The backend behind every
              UCP&nbsp;Campus experience.
            </h1>
            <p
              style={{
                color: '#a9bccf',
                lineHeight: 1.7,
                fontSize: 15.5,
                margin: '0 0 22px',
                maxWidth: 560,
              }}
            >
              One deployment serves the Android app, the Chrome extension and
              the shared community — the same server, the same identity rules,
              the same leaderboard. Built for the UCP ecosystem, not for the
              open web.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href="#api"
                style={{
                  background: '#1789B8',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '12px 18px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Explore the API →
              </Link>
              <Link
                href="/policy"
                style={{
                  color: '#e9eef5',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 12,
                  padding: '12px 18px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                How student data is used
              </Link>
            </div>
          </div>
          <aside
            style={{
              background: 'linear-gradient(180deg, #101b22, #0e151b)',
              border: '1px solid rgba(127,212,240,0.12)',
              borderRadius: 20,
              padding: 22,
              boxShadow: '0 30px 60px rgba(0,0,0,0.35)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.09em',
                fontWeight: 800,
                color: '#7fd4f0',
                marginBottom: 12,
              }}
            >
              WHAT SHIPS FROM THIS HOST
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'grid',
                gap: 10,
                fontSize: 13.5,
                color: '#cdd8e2',
              }}
            >
              {[
                ['Android app', 'community · leaderboard · timetable'],
                ['Chrome extension', 'grade sync · live class ranking'],
                ['Community API', 'feed, votes, comments, teachers'],
                ['Admin panel', 'health, credits, cookie vault, migration'],
              ].map(([title, sub]) => (
                <li
                  key={title}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'baseline',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    padding: '10px 12px',
                  }}
                >
                  <span style={{ color: '#F4A82A', fontWeight: 800 }}>▸</span>
                  <span>
                    <strong style={{ color: '#f2f6fa' }}>{title}</strong>
                    <br />
                    <span style={{ color: '#8ba0b3', fontSize: 12 }}>{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </header>

        {/* Endpoint map */}
        <section id="api" style={{ padding: '24px 0 8px' }}>
          <h2
            style={{
              fontSize: 15,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: '#7d93a6',
              margin: '0 0 14px',
            }}
          >
            Endpoint map
          </h2>
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            {groups.map((g) => (
              <section
                key={g.title}
                style={{
                  background: '#101b22',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <h3 style={{ fontSize: 14.5, margin: '0 0 10px', color: '#f2f6fa' }}>
                  {g.title}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {g.items.map(([label, href]) => (
                    <li key={href} style={{ margin: '7px 0', fontSize: 13.5 }}>
                      <Link
                        href={href}
                        style={{ color: '#7fd4f0', textDecoration: 'none' }}
                      >
                        {label}
                      </Link>
                      <span style={{ color: '#5c6f80', fontSize: 11, marginLeft: 6 }}>
                        {href}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        {/* Data-sharing callout */}
        <aside
          style={{
            background:
              'linear-gradient(90deg, rgba(244,168,42,0.10), rgba(23,137,184,0.08))',
            border: '1px solid rgba(244,168,42,0.25)',
            borderRadius: 16,
            padding: '18px 20px',
            marginTop: 22,
            lineHeight: 1.65,
          }}
        >
          <strong style={{ color: '#F4A82A' }}>Student data, in plain words:</strong>{' '}
          <span style={{ color: '#dce5ec' }}>
            the extension shares your student id, course codes and grade
            summaries so your class section has a ranked board; breakdowns
            stay with your section only. Your name and photo show up only
            while you keep them visible — you can hide them in the app or
            the extension and it applies everywhere at once. See the{' '}
            <Link href="/policy" style={{ color: '#7fd4f0' }}>
              full policy
            </Link>
            .
          </span>
        </aside>

        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 36,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: 18,
            fontSize: 12,
            color: '#5c6f80',
            flexWrap: 'wrap',
          }}
        >
          <span>UCP Campus backend · Heroku · ucp-campus-community</span>
          <span>
            <Link href="/api/health" style={{ color: '#7fd4f0', textDecoration: 'none' }}>
              Health
            </Link>
            {' · '}
            <Link href="/policy" style={{ color: '#7fd4f0', textDecoration: 'none' }}>
              Privacy
            </Link>
            {' · '}
            <Link href="/admin" style={{ color: '#7fd4f0', textDecoration: 'none' }}>
              Admin
            </Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
