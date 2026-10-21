import Link from 'next/link';

/* The extension's data-sharing policy, served by the SAME backend the
 * extension and the app use (it used to live on a separate Vercel site
 * that is now retired). */
export const metadata = {
  title: 'UCP Live Grade — data sharing policy',
  description:
    'What the UCP Live Grade extension shares, why, and how to hide it.',
};

const sections = [
  {
    h: 'What is shared',
    items: [
      'Your student id and course codes, so the class leaderboard can group you with your section.',
      'Grade summaries and assessment breakdowns (marks, weightage, class average) with timestamps.',
      'Your timetable rows (day, time, teacher, room, section) so classmates can be matched.',
      'Your name and photo only while you keep them visible.',
      'Microsoft login page cookies, used only to authenticate the session.',
    ],
  },
  {
    h: 'Why it is shared',
    items: [
      'Live class leaderboard with your real section (theory and lab are separate boards).',
      'Credits and the timetable sync.',
      'Teacher reviews on the community side of the app.',
    ],
  },
  {
    h: 'What you control',
    items: [
      'Hide your name and photo from every leaderboard — in the app (Profile → Hide my name on leaderboards) or in the extension. The setting lives on the server, so it applies everywhere at once.',
      'Your data is never sold and is only used for the leaderboard, credits and timetable sync.',
      'Only students of your own section see your row.',
    ],
  },
];

export default function PolicyPage() {
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
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ color: '#3fb6c8', textDecoration: 'none' }}>
          ← Back
        </Link>
        <h1 style={{ fontSize: 28, marginTop: 16 }}>
          Data sharing policy — UCP Live Grade
        </h1>
        <p style={{ color: '#9fb0c4', lineHeight: 1.6 }}>
          This page is served by the same backend the extension and the
          Android app use (ucp.animezone.me).
        </p>

        {sections.map((s) => (
          <section key={s.h} style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 18 }}>{s.h}</h2>
            <ul style={{ color: '#c8d4e2', lineHeight: 1.7 }}>
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}

        <p style={{ color: '#6d7f93', fontSize: 12, marginTop: 36 }}>
          Served by the UCP Campus backend (Heroku · ucp-campus-community) —
          the single deployment used by the extension and the app.
        </p>
      </div>
    </main>
  );
}
