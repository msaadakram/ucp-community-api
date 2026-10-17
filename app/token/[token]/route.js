import { verifyTokenParamsSchema } from '@/lib/ext/schemas2';

/* Token claim page — was GET /token/:token (Express + inline HTML).
 * Same glass UI; the inline verifier now calls /api/ext/earn/verify. */

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const { token } = await params;
  const checked = verifyTokenParamsSchema.validate({ token });
  if (checked.error) {
    return new Response('Invalid token', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const page = TOKEN_HTML.replaceAll('__TOKEN__', token);
  return new Response(page, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

const TOKEN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Claim Your Credits</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0a0a1a;
      overflow: hidden;
    }

    /* Animated background orbs */
    .bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.25;
      animation: float 20s ease-in-out infinite;
    }
    .orb-1 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, #6366f1 0%, transparent 70%);
      top: -15%; left: -10%;
      animation-delay: 0s;
    }
    .orb-2 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
      bottom: -20%; right: -5%;
      animation-delay: -7s;
    }
    .orb-3 {
      width: 350px; height: 350px;
      background: radial-gradient(circle, #a78bfa 0%, transparent 70%);
      top: 40%; left: 50%;
      animation-delay: -14s;
    }
    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(30px, -40px) scale(1.08); }
      50% { transform: translate(-20px, 20px) scale(0.95); }
      75% { transform: translate(-35px, -15px) scale(1.05); }
    }

    /* Grid pattern overlay */
    .grid-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image:
        linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px);
      background-size: 60px 60px;
    }

    /* Main card */
    .wrapper { position: relative; z-index: 1; width: 90%; max-width: 460px; }

    .card {
      position: relative;
      background: rgba(15, 15, 35, 0.6);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 28px;
      padding: 48px 36px 40px;
      text-align: center;
      box-shadow:
        0 0 0 1px rgba(99,102,241,0.1),
        0 24px 80px rgba(0,0,0,0.4),
        0 8px 24px rgba(0,0,0,0.2);
      transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Shimmer border */
    .card::before {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: 29px;
      padding: 1px;
      background: linear-gradient(
        135deg,
        rgba(99,102,241,0.3),
        rgba(139,92,246,0.2),
        rgba(167,139,250,0.3),
        rgba(99,102,241,0.2)
      );
      background-size: 300% 300%;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      animation: shimmer 4s ease-in-out infinite;
      z-index: -1;
    }
    @keyframes shimmer {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }

    /* === STATES === */

    /* Loading spinner */
    .spinner-ring {
      width: 56px; height: 56px;
      margin: 0 auto 28px;
      position: relative;
    }
    .spinner-ring::before {
      content: "";
      position: absolute; inset: 0;
      border-radius: 50%;
      border: 3px solid rgba(99,102,241,0.12);
    }
    .spinner-ring::after {
      content: "";
      position: absolute; inset: 0;
      border-radius: 50%;
      border: 3px solid transparent;
      border-top-color: #818cf8;
      border-right-color: #a78bfa;
      animation: spin 0.9s linear infinite;
    }
    .spinner-ring .pulse-dot {
      position: absolute; top: 50%; left: 50%;
      width: 8px; height: 8px;
      background: #a78bfa;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(167,139,250,0.4); }
      50% { box-shadow: 0 0 0 16px rgba(167,139,250,0); }
    }

    /* Success icon */
    .icon-circle {
      width: 80px; height: 80px;
      margin: 0 auto 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .icon-circle.success {
      background: rgba(16, 185, 129, 0.1);
      box-shadow: 0 0 40px rgba(16, 185, 129, 0.15), inset 0 0 20px rgba(16, 185, 129, 0.05);
    }
    .icon-circle.error {
      background: rgba(239, 68, 68, 0.1);
      box-shadow: 0 0 40px rgba(239, 68, 68, 0.15), inset 0 0 20px rgba(239, 68, 68, 0.05);
    }
    @keyframes popIn {
      0% { transform: scale(0); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Icons SVG */
    .icon-circle svg { width: 36px; height: 36px; }

    /* Typography */
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
      color: #f1f5f9;
    }
    .subtitle {
      font-size: 0.925rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    /* Credit badge */
    .credit-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(99,102,241,0.1);
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 16px;
      padding: 12px 24px;
      margin-top: 4px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .credit-badge .coin-icon {
      width: 24px; height: 24px;
      background: linear-gradient(135deg, #f59e0b, #fbbf24);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      color: #78350f;
      box-shadow: 0 0 12px rgba(245,158,11,0.4);
    }
    .credit-badge .amount {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #818cf8, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .credit-badge .label {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Particles - success celebration */
    .particles { position: fixed; inset: 0; pointer-events: none; z-index: 2; }
    .particle {
      position: absolute;
      width: 6px; height: 6px;
      border-radius: 50%;
      animation: particleBurst 1.2s ease-out forwards;
    }
    @keyframes particleBurst {
      0% { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }

    /* Redirect countdown */
    .countdown-bar {
      margin-top: 28px;
      height: 3px;
      border-radius: 99px;
      background: rgba(255,255,255,0.05);
      overflow: hidden;
    }
    .countdown-bar-fill {
      height: 100%;
      border-radius: 99px;
      background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);
      animation: countdown 3s linear forwards;
    }
    @keyframes countdown {
      0% { width: 100%; }
      100% { width: 0%; }
    }
    .countdown-text {
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 8px;
      font-weight: 500;
    }

    /* Error CTA button */
    .cta-btn {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 28px;
      border-radius: 14px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      font-weight: 600;
      text-decoration: none;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(99,102,241,0.3);
    }
    .cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(99,102,241,0.45);
    }

    .hidden { display: none !important; }

    /* Responsive */
    @media (max-width: 480px) {
      .card { padding: 36px 24px 32px; border-radius: 24px; }
      h1 { font-size: 1.4rem; }
      .credit-badge .amount { font-size: 1.3rem; }
    }
  </style>
</head>
<body>

  <!-- Background -->
  <div class="bg-orbs">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
  </div>
  <div class="grid-overlay"></div>

  <!-- Success particles container -->
  <div class="particles" id="particles"></div>

  <!-- Main wrapper -->
  <div class="wrapper">
    <div class="card">

      <!-- === LOADING STATE === -->
      <div id="state-loading">
        <div class="spinner-ring"><div class="pulse-dot"></div></div>
        <h1>Verifying your reward</h1>
        <p class="subtitle">Please wait while we confirm your token...</p>
      </div>

      <!-- === SUCCESS STATE === -->
      <div id="state-success" class="hidden">
        <div class="icon-circle success">
          <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h1>Credits Added!</h1>
        <p class="subtitle" id="success-msg">Credits have been added to your account.</p>
        <div class="credit-badge">
          <div class="coin-icon">+</div>
          <div>
            <div class="amount" id="credit-total">0</div>
            <div class="label">Total Credits</div>
          </div>
        </div>
        <div class="countdown-bar">
          <div class="countdown-bar-fill"></div>
        </div>
        <p class="countdown-text">Redirecting in 3 seconds...</p>
      </div>

      <!-- === ERROR STATE === -->
      <div id="state-error" class="hidden">
        <div class="icon-circle error">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h1 id="error-heading">Verification Failed</h1>
        <p class="subtitle" id="error-msg">Could not verify your reward token.</p>
        <a href="/" class="cta-btn">Return Home</a>
      </div>

    </div>
  </div>

  <script>
    (function () {
      var loadingEl = document.getElementById("state-loading");
      var successEl = document.getElementById("state-success");
      var errorEl = document.getElementById("state-error");

      function show(state) {
        loadingEl.classList.add("hidden");
        successEl.classList.add("hidden");
        errorEl.classList.add("hidden");
        if (state === "success") successEl.classList.remove("hidden");
        if (state === "error") errorEl.classList.remove("hidden");
      }

      function spawnParticles() {
        var container = document.getElementById("particles");
        var colors = ["#818cf8","#a78bfa","#c4b5fd","#10b981","#fbbf24","#f59e0b"];
        for (var i = 0; i < 30; i++) {
          var p = document.createElement("div");
          p.className = "particle";
          p.style.left = "50%";
          p.style.top = "45%";
          p.style.setProperty("--tx", (Math.random() * 300 - 150) + "px");
          p.style.setProperty("--ty", (Math.random() * 300 - 150) + "px");
          p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          p.style.width = (4 + Math.random() * 8) + "px";
          p.style.height = p.style.width;
          p.style.animationDuration = (0.8 + Math.random() * 1.2) + "s";
          p.style.animationDelay = Math.random() * 0.3 + "s";
          container.appendChild(p);
          setTimeout(function () { p.remove(); }, 1800);
        }
      }

      (async function verify() {
        try {
          var params = new URLSearchParams(window.location.search);
          var accessKey = params.get("key");
          if (!accessKey) {
            show("error");
            document.getElementById("error-heading").textContent = "Access Required";
            document.getElementById("error-msg").textContent =
              "Please open the short link to claim your credits.";
            return;
          }

          var resp = await fetch(
            "/api/ext/earn/verify/__TOKEN__?key=" + encodeURIComponent(accessKey)
          );
          var data = await resp.json();

          if (!resp.ok) {
            show("error");
            document.getElementById("error-heading").textContent = "Verification Failed";
            document.getElementById("error-msg").textContent =
              data.error || "Could not verify your reward token.";
            return;
          }

          // Success!
          show("success");
          document.getElementById("credit-total").textContent = data.credits || 0;
          document.getElementById("success-msg").textContent =
            data.message || "Credits have been added to your account.";
          spawnParticles();

          // Auto-redirect after 3s
          setTimeout(function () { window.close(); }, 3000);
        } catch (err) {
          show("error");
          document.getElementById("error-heading").textContent = "Connection Error";
          document.getElementById("error-msg").textContent =
            "Could not reach the server. Please check your connection and try again.";
        }
      })();
    })();
  </script>
</body>
</html>`
