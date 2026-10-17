/* Shared admin styles (single <style> injected by the layout). */

export const styles = `
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #0f1417; color: #e8eef1; margin: 0; }
  a { color: #5fd6e8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 20px 16px 64px; }
  header.top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
  .brand small { display: block; font-size: 12px; font-weight: 400; color: #93a3ad; }
  nav.tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
  nav.tabs a { padding: 8px 14px; border-radius: 999px; background: #1b2429; color: #c8d4da; font-size: 13px; font-weight: 600; }
  nav.tabs a.on { background: #0e7c8c; color: #fff; }
  nav.tabs a:hover { text-decoration: none; filter: brightness(1.15); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px; }
  .card { background: #182024; border: 1px solid #263238; border-radius: 16px; padding: 16px; }
  .card h3 { margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #93a3ad; }
  .card .big { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; }
  .card .sub { font-size: 12px; color: #93a3ad; margin-top: 4px; }
  table.tbl { width: 100%; border-collapse: collapse; font-size: 13px; background: #182024; border-radius: 16px; overflow: hidden; }
  table.tbl th, table.tbl td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #263238; vertical-align: top; }
  table.tbl th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #93a3ad; background: #141b1f; }
  table.tbl tr:last-child td { border-bottom: none; }
  table.tbl tr:hover td { background: #1c262b; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .pill.g { background: rgba(46, 204, 113, 0.15); color: #5ee7a4; }
  .pill.y { background: rgba(241, 196, 15, 0.15); color: #ffd43b; }
  .pill.r { background: rgba(231, 76, 60, 0.15); color: #ff8a80; }
  .pill.b { background: rgba(95, 214, 232, 0.15); color: #5fd6e8; }
  .toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
  .toolbar input, .toolbar select { background: #141b1f; border: 1px solid #2b383f; color: #e8eef1; border-radius: 10px; padding: 8px 12px; font-size: 13px; }
  .btn { display: inline-block; background: #0e7c8c; color: #fff; border: none; border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .btn:hover { filter: brightness(1.12); }
  .btn.ghost { background: #263238; }
  .btn.danger { background: #a33; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { background: rgba(231, 76, 60, 0.12); border: 1px solid rgba(231, 76, 60, 0.4); color: #ff9d94; padding: 12px 14px; border-radius: 12px; font-size: 13px; margin-bottom: 14px; }
  .ok { background: rgba(46, 204, 113, 0.12); border: 1px solid rgba(46, 204, 113, 0.4); color: #7de8ab; padding: 12px 14px; border-radius: 12px; font-size: 13px; margin-bottom: 14px; }
  .muted { color: #93a3ad; font-size: 12px; }
  .pager { display: flex; gap: 8px; align-items: center; margin-top: 12px; font-size: 13px; color: #93a3ad; }
  code.mono { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 12px; background: #101619; padding: 2px 6px; border-radius: 6px; }
  .login-box { max-width: 380px; margin: 12vh auto 0; background: #182024; border: 1px solid #263238; border-radius: 20px; padding: 28px; }
  .login-box h1 { margin: 0 0 4px; font-size: 22px; }
  .login-box label { display: block; font-size: 12px; color: #93a3ad; margin: 14px 0 6px; }
  .login-box input { width: 100%; background: #101619; border: 1px solid #2b383f; color: #e8eef1; border-radius: 10px; padding: 10px 12px; font-size: 14px; }
  .login-box button { width: 100%; margin-top: 18px; }
`;
