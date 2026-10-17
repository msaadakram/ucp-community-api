/* Shared admin shell component (tab nav + logout). Imported by every
 * admin page — NOT a Next layout export (nested layouts don't re-export
 * named components to pages). */

import LogoutButton from './admin-logout';

const TABS = [
  ['/admin', 'Overview', 'overview'],
  ['/admin/grades', 'Grades', 'grades'],
  ['/admin/leaderboard', 'Leaderboard', 'leaderboard'],
  ['/admin/timetable', 'Timetable', 'timetable'],
  ['/admin/cookies', 'Cookies', 'cookies'],
  ['/admin/credits', 'Credits', 'credits'],
  ['/admin/earn', 'Earn', 'earn'],
  ['/admin/migrate', 'Migrate', 'migrate'],
  ['/admin/health', 'Health', 'health'],
];

export function Shell({ username, active, children }) {
  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          UCP Campus API — Admin
          <small>
            signed in as <b>{username}</b>
          </small>
        </div>
        <LogoutButton />
      </header>
      <nav className="tabs">
        {TABS.map(([href, label, key]) => (
          <a key={key} href={href} className={active === key ? 'on' : ''}>
            {label}
          </a>
        ))}
      </nav>
      {children}
    </div>
  );
}
