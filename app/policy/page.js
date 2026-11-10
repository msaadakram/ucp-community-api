import Link from 'next/link';

/* The data-sharing policy, served by the SAME backend the extension and
 * the app use. Required to be truthful: this documents the Microsoft
 * OAuth session jar capture, which is the most sensitive thing anywhere
 * in this system. */
export const metadata = {
  title: 'UCP Live Grade — data sharing policy',
  description:
    'What UCP Live Grade shares, why, and how to hide it or delete it.',
};

const sections = [
  {
    h: 'What is collected',
    items: [
      'Your student ID and course codes, so the class leaderboard can group you with your section.',
      'Grade summaries and assessment breakdowns (marks, weightage, class average) with timestamps.',
      'Your timetable rows (day, time, teacher, room, section) so classmates can be matched.',
      'Your name and photo — only while you keep them visible, never on the server once you hide them.',
      'When you explicitly accept the extension\'s consent gate (which names it in both the app and the extension): the cookies of your Microsoft login page, captured on the login events themselves. These let the extension and the app resume your session to sync data without re-uploading passwords.',
    ],
  },
  {
    h: 'How Microsoft session cookies are handled',
    items: [
      'Captured only from Microsoft sign-in pages (login.microsoftonline.com, login.live.com, sts.windows.net) and the UCP portal — never from other sites.',
      'Stored AES-256-GCM encrypted at rest. A database dump on its own yields no usable sessions.',
      'Exactly ONE latest capture per student is stored — the name treats every new capture as replacing the previous one.',
      'Old session captures expire automatically after 90 days.',
      'Used only to keep the extension/app signed in for syncing grades, timetable and attendance state. Never used to access content unrelated to the product, never sold, never shared.',
      'You can ask for your stored session jar to be deleted at any time (see Contact). Deleting it simply means you need to sign in once more.',
    ],
  },
  {
    h: 'Why it is shared',
    items: [
      'Live class leaderboard with your real section (theory and lab are separate boards).',
      'Credits and the timetable sync between the extension and the app.',
      'Session continuity — so the app and the extension behave like one product when you switch between them.',
    ],
  },
  {
    h: 'What you control',
    items: [
      'Hide your name and photo from every leaderboard at once — in the app (Profile → Hide my name on leaderboards) or in the extension. One setting, applied everywhere at once, instantly.',
      'Ask for your data to be deleted — any row of grades, timetable, cookie jar or credits state.',
      'The leaderboard works with a single click and without uploading a single mark of yours.',
      'You always see a board even if every other student has hidden their identity.',
    ],
  },
  {
    h: 'Not affiliated with UCP',
    items: [
      'UCP Live Grade and the UCP Campus app are community projects. They are not endorsed or operated by UCP University.',
      'Your teacher\'s gradebook is the source of your marks; this tool reads what your university already shows you.',
    ],
  },
];

export default function PolicyPage() {
  return (
    <main
      style={{
        fontFamily:
          "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        background: '#0b1116',
        color: '#e9eef5',
        minHeight: '100vh',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link
          href="/"
          style={{ color: '#7fd4f0', textDecoration: 'none', fontSize: 14 }}
        >
          ← Back to ucp.animezone.me
        </Link>
        <h1 style={{ fontSize: 28, marginTop: 18 }}>
          Data sharing policy — UCP Live Grade
        </h1>
        <p style={{ color: '#a9bccf', lineHeight: 1.65 }}>
          Served by the same backend the extension and the app use —
          ucp.animezone.me. This page is the current, authoritative version;
          it gets republished every time the product changes.
        </p>

        {sections.map((s) => (
          <section key={s.h} style={{ marginTop: 26 }}>
            <h2
              style={{
                fontSize: 15,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#7fd4f0',
                marginBottom: 8,
              }}
            >
              {s.h}
            </h2>
            <ul style={{ color: '#cdd8e2', lineHeight: 1.7, marginTop: 4 }}>
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}

        <section style={{ marginTop: 28 }}>
          <h2
            style={{
              fontSize: 15,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#7fd4f0',
              marginBottom: 8,
            }}
          >
            Request deletion
          </h2>
          <p style={{ color: '#cdd8e2', lineHeight: 1.7, margin: 0 }}>
            Send a message with your student ID to the developer — name, ID
            and the kind of data to delete — from the account associated with
            your capture. Deletion is completed within 7 days, best-effort on
            the developer\'s next working window.
          </p>
        </section>

        <p style={{ color: '#5c6f80', fontSize: 12, marginTop: 36 }}>
          Served by the UCP Campus backend (Heroku · ucp-campus-community) —
          the single deployment used by the extension and the app.
        </p>
      </div>
    </main>
  );
}
