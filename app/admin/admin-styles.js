/* Shared admin styles — design system for the management dashboard.
 * Single <style> injected by the layout. Every admin page consumes the
 * components here; keep class names stable when restyling. */

export const styles = `
  :root {
    --bg: #0b1115;
    --panel: #121a20;
    --panel-2: #17222a;
    --panel-3: #1d2a33;
    --line: rgba(150, 186, 202, 0.10);
    --line-strong: rgba(150, 186, 202, 0.18);
    --text: #dde8ec;
    --muted: #8899a4;
    --accent: #22c8e0;
    --accent-dim: rgba(34, 200, 224, 0.14);
    --accent-deep: #0e7c8c;
    --good: #3ddc84;
    --warn: #f5c04e;
    --bad: #f26d5b;
    --info: #5fd6e8;
    --radius: 18px;
    --radius-sm: 12px;
    --shadow: 0 18px 44px rgba(0, 0, 0, 0.38);
    --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    --mono: ui-monospace, "Cascadia Code", Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    font-family: var(--font);
    background:
      radial-gradient(1100px 600px at 15% -10%, rgba(34, 200, 224, 0.09), transparent 55%),
      radial-gradient(900px 500px at 110% 10%, rgba(34, 200, 224, 0.05), transparent 50%),
      var(--bg);
    color: var(--text);
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: none; filter: brightness(1.15); }

  /* ============ Shell: sidebar + content ============ */
  .shell { display: flex; min-height: 100vh; }

  .sidebar {
    width: 248px; flex: 0 0 248px;
    display: flex; flex-direction: column; gap: 4px;
    padding: 20px 14px 16px;
    border-right: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(18, 26, 32, 0.9), rgba(11, 17, 21, 0.65));
    position: sticky; top: 0; height: 100vh; overflow-y: auto;
  }
  .brandmark { display: flex; align-items: center; gap: 12px; padding: 4px 10px 18px; border-bottom: 1px solid var(--line); margin-bottom: 14px; }
  .brand-badge {
    width: 38px; height: 38px; flex: 0 0 38px; border-radius: 12px;
    display: grid; place-items: center;
    background: linear-gradient(140deg, #0e7c8c, #22c8e0);
    box-shadow: 0 6px 18px rgba(34, 200, 224, 0.28), inset 0 1px 0 rgba(255,255,255,0.35);
    color: #04262e; font-weight: 900; font-size: 17px; letter-spacing: -0.03em;
  }
  .brand-name { font-size: 15.5px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
  .brand-name small { display: block; font-size: 10.5px; font-weight: 600; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; margin-top: 3px; }

  .nav-group { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--muted); padding: 12px 10px 6px; text-transform: uppercase; }
  .nav-item {
    display: flex; align-items: center; gap: 11px;
    padding: 9px 10px; border-radius: var(--radius-sm);
    color: #b9c8cf; font-size: 13.5px; font-weight: 600;
    border: 1px solid transparent; transition: background .15s, color .15s, border-color .15s;
  }
  .nav-item svg { width: 17px; height: 17px; flex: 0 0 17px; stroke: currentColor; fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; opacity: 0.85; }
  .nav-item:hover { background: var(--panel-2); color: var(--text); }
  .nav-item.on {
    background: linear-gradient(120deg, var(--accent-deep) 0%, rgba(34, 200, 224, 0.16) 130%);
    border-color: rgba(34, 200, 224, 0.35);
    color: #eaf7fb; box-shadow: inset 3px 0 0 var(--accent);
  }
  .nav-item.on svg { opacity: 1; color: var(--accent); }

  .side-foot { margin-top: auto; padding-top: 14px; border-top: 1px solid var(--line); }
  .side-foot .btn { width: 100%; justify-content: center; margin-top: 10px; }
  .side-user { display: flex; align-items: center; gap: 10px; padding: 8px 10px; }
  .side-avatar { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #04262e; background: linear-gradient(140deg, #22c8e0, #0e7c8c); }
  .side-user b { display: block; font-size: 12.5px; }
  .side-user span { font-size: 11px; color: var(--muted); }

  .content { flex: 1; min-width: 0; padding: 22px 28px 72px; max-width: 1180px; }

  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
  .crumb { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .crumb b { color: var(--accent); font-weight: 800; }
  .topbar-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  /* ============ Headings ============ */
  .page-title { font-size: 22px; font-weight: 800; letter-spacing: -0.025em; margin: 0; }
  .page-sub { color: var(--muted); font-size: 13px; margin: 2px 0 0; }
  .section-label { font-size: 10.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin: 22px 2px 10px; display: flex; align-items: center; gap: 10px; }
  .section-label::after { content: ""; flex: 1; height: 1px; background: var(--line); }

  /* ============ KPI cards ============ */
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(168px, 1fr)); gap: 12px; }
  .card {
    position: relative; overflow: hidden;
    background: linear-gradient(180deg, var(--panel) 0%, #10171d 100%);
    border: 1px solid var(--line); border-radius: var(--radius);
    padding: 15px 16px 14px;
    transition: transform .18s ease, border-color .18s ease;
  }
  .card:hover { transform: translateY(-2px); border-color: var(--line-strong); }
  .card::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(34, 200, 224, 0.55), transparent); opacity: 0.6; }
  .card h3 { margin: 0 0 6px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.11em; color: var(--muted); display: flex; align-items: center; gap: 7px; }
  .card h3 svg { width: 13px; height: 13px; stroke: var(--accent); fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; opacity: 0.9; }
  .card .big { font-size: 29px; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .card .sub { font-size: 11.5px; color: var(--muted); margin-top: 6px; }
  .card .sub code { font-size: 11px; }

  /* ============ Tables ============ */
  .tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; }
  .tbl thead th { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); background: var(--panel-2); padding: 11px 14px; text-align: left; }
  .tbl td { padding: 11px 14px; border-top: 1px solid var(--line); vertical-align: middle; }
  .tbl tbody tr { transition: background .12s; }
  .tbl tbody tr:hover td { background: rgba(34, 200, 224, 0.05); }
  .tbl td, .tbl th { max-width: 280px; overflow: hidden; text-overflow: ellipsis; }

  /* ============ Pills ============ */
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 11px; border-radius: 999px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.03em; border: 1px solid transparent; }
  .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .pill.g { background: rgba(61, 220, 132, 0.10); color: #6ff0ad; border-color: rgba(61, 220, 132, 0.35); }
  .pill.y { background: rgba(245, 192, 78, 0.10); color: #ffdf8e; border-color: rgba(245, 192, 78, 0.35); }
  .pill.r { background: rgba(242, 109, 91, 0.12); color: #ffb0a4; border-color: rgba(242, 109, 91, 0.4); }
  .pill.b { background: var(--accent-dim); color: #7fe3f5; border-color: rgba(34, 200, 224, 0.35); }

  /* ============ Toolbar / forms ============ */
  .toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin: 14px 0 12px; }
  .toolbar input, .toolbar select, .toolbar textarea {
    background: #0d1418; border: 1px solid var(--line-strong); color: var(--text);
    border-radius: 10px; padding: 9px 12px; font-size: 13px; min-height: 36px;
  }
  input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: transparent; }

  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    background: linear-gradient(180deg, #14a0b4, #0e7c8c); color: #eafcff;
    border: 1px solid rgba(34, 200, 224, 0.45); border-radius: 10px;
    padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 14px rgba(14, 124, 140, 0.35), inset 0 1px 0 rgba(255,255,255,0.18);
    transition: filter .15s, transform .15s; font-family: var(--font);
  }
  .btn:hover { filter: brightness(1.14); transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  .btn.ghost { background: var(--panel-2); border-color: var(--line-strong); color: #c8d6dc; box-shadow: none; }
  .btn.ghost:hover { background: var(--panel-3); }
  .btn.danger { background: linear-gradient(180deg, #b4433a, #8a2f2a); border-color: rgba(242, 109, 91, 0.5); color: #ffe3de; box-shadow: 0 4px 14px rgba(179, 67, 58, 0.3); }
  .btn.danger:hover { filter: brightness(1.18); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  .btn.sm { padding: 6px 12px; font-size: 12px; }

  /* ============ Notices ============ */
  .error { background: rgba(242, 109, 91, 0.10); border: 1px solid rgba(242, 109, 91, 0.4); color: #ffb0a4; padding: 13px 15px; border-radius: var(--radius-sm); font-size: 13px; margin: 12px 0; }
  .ok { background: rgba(61, 220, 132, 0.08); border: 1px solid rgba(61, 220, 132, 0.35); color: #8ff0b6; padding: 13px 15px; border-radius: var(--radius-sm); font-size: 13px; margin: 12px 0; }
  .muted { color: var(--muted); font-size: 12.5px; }
  .pager { display: flex; gap: 10px; align-items: center; margin-top: 14px; font-size: 13px; color: var(--muted); }
  code.mono { font-family: var(--mono); font-size: 12px; background: #0d1418; border: 1px solid var(--line); padding: 2px 7px; border-radius: 6px; color: #bfe8ef; }
  .row-between { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }

  h1, h2, h3 { letter-spacing: -0.02em; }
  h2 { font-size: 19px; }

  /* ============ Login ============ */
  .login-page { min-height: 100vh; display: grid; grid-template-columns: 1.15fr 1fr; }
  .login-hero {
    position: relative; display: flex; flex-direction: column; justify-content: space-between;
    padding: 44px 48px; overflow: hidden;
    background:
      radial-gradient(700px 500px at 20% 0%, rgba(34, 200, 224, 0.22), transparent 60%),
      radial-gradient(600px 600px at 90% 110%, rgba(34, 200, 224, 0.12), transparent 55%),
      #08131a;
    border-right: 1px solid var(--line);
  }
  .login-hero .mark-row { display: flex; align-items: center; gap: 14px; }
  .login-hero h1 { font-size: 42px; line-height: 1.05; font-weight: 900; letter-spacing: -0.035em; margin: 0; max-width: 560px; }
  .login-hero h1 em { font-style: normal; color: var(--accent); }
  .login-hero p { color: var(--muted); max-width: 460px; margin: 18px 0 0; font-size: 15px; line-height: 1.6; }
  .hero-feats { display: grid; gap: 12px; margin-top: 34px; max-width: 440px; }
  .hero-feat { display: flex; gap: 12px; align-items: flex-start; font-size: 13px; color: #b9c8cf; }
  .hero-feat b { color: var(--text); }
  .feat-dot { flex: 0 0 10px; width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; background: var(--accent); box-shadow: 0 0 10px rgba(34, 200, 224, 0.6); }
  .hero-foot { font-size: 11px; color: var(--muted); border-top: 1px solid var(--line); padding-top: 16px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .login-panel { display: flex; align-items: center; justify-content: center; padding: 40px 28px; }
  .login-box { width: 100%; max-width: 392px; background: var(--panel); border: 1px solid var(--line-strong); border-radius: 22px; padding: 30px 30px 26px; box-shadow: var(--shadow); }
  .login-box h1 { margin: 0 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
  .login-box label { display: block; font-size: 11px; font-weight: 700; color: var(--muted); margin: 16px 0 7px; letter-spacing: 0.04em; text-transform: uppercase; }
  .login-box input { width: 100%; background: #0d1418; border: 1px solid var(--line-strong); color: var(--text); border-radius: 10px; padding: 12px 13px; font-size: 14px; }
  .login-box button { width: 100%; margin-top: 20px; justify-content: center; padding: 12px 16px; }

  /* ============ Focus ============ */
  button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 8px; }

  /* ============ Responsive ============ */
  @media (max-width: 1020px) {
    .content { padding: 18px 18px 60px; }
  }
  @media (max-width: 900px) {
    .shell { flex-direction: column; }
    .sidebar { position: sticky; top: 0; z-index: 20; width: 100%; flex: none; height: auto; flex-direction: row; align-items: center; overflow-x: auto; gap: 4px; padding: 10px 12px; border-right: none; border-bottom: 1px solid var(--line); background: rgba(11, 17, 21, 0.92); backdrop-filter: blur(10px); }
    .brandmark { padding: 0 10px 0 0; border-bottom: none; margin: 0; border-right: 1px solid var(--line); padding-right: 12px; }
    .brand-name small, .brand-name, .nav-group, .side-foot, .side-user { display: none; }
    .nav-item { padding: 9px 12px; font-size: 12px; border-radius: 10px; white-space: nowrap; }
    .nav-item.on { box-shadow: inset 0 -3px 0 var(--accent); border-color: transparent; }
    .content { padding: 16px 14px 56px; }
    .login-page { grid-template-columns: 1fr; }
    .login-hero { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .card, .btn, .nav-item, .tbl tbody tr { transition: none; }
  }
`;
