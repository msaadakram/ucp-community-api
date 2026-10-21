import Link from 'next/link';

/* Landing page for the ONE backend that serves every UCP client:
 *   - the Android app (community + leaderboard)
 *   - the Chrome extension (/api/ext/*)
 *   - the admin panel
 * Nothing else is deployed: every client talks to this host.
 */
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
    title: 'Admin',
    items: [
      ['Control panel', '/admin'],
      ['Sessions', '/admin/sessions'],
      ['Credits', '/admin/credits'],
      ['Migration', '/admin/migrate'],
    ],
  },
];

export default function Home() {
  return (
    <main
      style={{
        fontFamily:
          'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        background: '#0f1115',
        color: '#e9eef5',
        minHeight: '100vh',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>UCP Campus Backend</h1>
        <p style={{ color: '#9fb0c4', marginTop: 8, lineHeight: 1.6 }}>
          One Heroku deployment serves <strong>everything</strong>: the UCP
          University Android app, the Chrome extension and the community API.
          There is no second server — both clients use the same host, the same
          database and the same identity rules.
        </p>

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            marginTop: 32,
          }}
        >
          {groups.map((g) => (
            <section
              key={g.title}
              style={{
                background: '#161a21',
                border: '1px solid #232a35',
                borderRadius: 16,
                padding: 18,
              }}
            >
              <h2 style={{ fontSize: 16, margin: '0 0 10px' }}>{g.title}</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {g.items.map(([label, href]) => (
                  <li key={href} style={{ margin: '6px 0' }}>
                    <Link
                      href={href}
                      style={{ color: '#3fb6c8', textDecoration: 'none' }}
                    >
                      {label}
                    </Link>
                    <span style={{ color: '#6d7f93', fontSize: 12 }}>
                      {' '}
                      {href}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section
          style={{
            background: '#161a21',
            border: '1px solid #232a35',
            borderRadius: 16,
            padding: 18,
            marginTop: 16,
          }}
        >
          <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>
            Data sharing policy
          </h2>
          <p style={{ color: '#9fb0c4', lineHeight: 1.6, margin: 0 }}>
            The extension shares your student id, course codes and grade
            summaries so the class leaderboard works; assessment breakdowns
            and timestamps; your name and photo only while you keep them
            visible (you can hide them any time, in the app or the
            extension); and Microsoft login page cookies for authentication.
            Your data is used only for the leaderboard, credits and timetable
            sync. See the{' '}
            <Link href="/policy" style={{ color: '#3fb6c8' }}>
              full policy
            </Link>
            .
          </p>
        </section>

        <p style={{ color: '#6d7f93', fontSize: 12, marginTop: 28 }}>
          Deployment: Heroku · app: ucp-campus-community · domain:
          ucp.animezone.me
        </p>
      </div>
    </main>
  );
}
