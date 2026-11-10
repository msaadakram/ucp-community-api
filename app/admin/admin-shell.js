/* Shared admin shell: sidebar navigation + topbar. Imported by every
 * admin page (nested layouts don't re-export named components). */

import LogoutButton from './admin-logout';

const ICONS = {
  overview: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  grades: '<path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M9.5 13.5l2 2 3.5-4"/>',
  leaderboard: '<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4a2 2 0 0 0 2 5h1"/><path d="M17 6h3a2 2 0 0 1-2 5h-1"/>',
  timetable: '<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/><path d="M3.5 9.5h17"/>',
  cookies: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 10.5h.01M14.5 9.5h.01M10.5 14.5h.01M14 14h.01"/>',
  credits: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5h5M9.5 12h5M10.5 14.5a2.2 2.2 0 0 0 2.2 1.8 2.7 2.7 0 0 0 2.3-1.4"/>',
  earn: '<path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 6v14"/><path d="M4 12a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"/>',
  migrate: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  health: '<path d="M12 21s-7-4.5-9.2-9A5.4 5.4 0 0 1 12 6.5 5.4 5.4 0 0 1 21.2 12c-2.2 4.5-9.2 9-9.2 9z"/>',
};

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

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || ICONS.overview }} />
  );
}

const TITLES = Object.fromEntries(TABS.map(([href, label, key]) => [key, label]));

export function Shell({ username, active, children, actions }) {
  const activeLabel = TITLES[active] || 'Admin';
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brandmark" href="/admin" aria-label="UCP Campus API admin home">
          <div className="brand-badge">U</div>
          <div className="brand-name">
            UCP Campus
            <small>Admin Console</small>
          </div>
        </a>
        <nav className="nav-group">Manage</nav>
        {TABS.map(([href, label, key]) => (
          <a
            key={key}
            href={href}
            className={active === key ? 'nav-item on' : 'nav-item'}
            aria-current={active === key ? 'page' : undefined}
          >
            <Icon name={key} />
            <span>{label}</span>
          </a>
        ))}
        <div className="side-foot">
          <div className="side-user">
            <div className="side-avatar">
              {(username || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <b>{username}</b>
              <span>Administrator</span>
            </div>
          </div>
          <div style={{ padding: '0 10px' }}>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="content">
        <div className="topbar">
          <div className="crumb">
            Console <b>› {activeLabel}</b>
          </div>
          <div className="topbar-actions">{actions}</div>
        </div>
        {children}
      </main>
    </div>
  );
}
