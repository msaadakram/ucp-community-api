#!/usr/bin/env bash
# Deploy the ONE backend (Heroku: ucp-campus-community) and verify that
# every client points at it.
#
#   scripts/deploy.sh            # push + wait + health check
#   scripts/deploy.sh --check    # only verify (no deploy)
#
# The check greps the app and the extension for their backend URL and
# fails when a client still points somewhere else (a second deployment is
# how rosters and leaderboards split in the first place).
set -euo pipefail

APP_NAME="${APP_NAME:-ucp-campus-community}"
HOST="${HOST:-https://ucp.animezone.me}"
API_KEY="${EXT_API_KEY:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="$(cd "$ROOT/.." && pwd)"
EXT_DIR="$WORKSPACE/ucp-live-grading-extenstion"
APP_DIR="$WORKSPACE/ucp-campus-app"

green() { printf '\033[32m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }
warn()  { printf '\033[33m%s\033[0m\n' "$1"; }

check_clients() {
  local failed=0

  # 1) extension: API base URLs + manifest host permission
  if [ -d "$EXT_DIR" ]; then
    if grep -rn "ucp.animezone.me" "$EXT_DIR/src/config.js" >/dev/null 2>&1; then
      green "extension  src/config.js        -> $HOST"
    else
      red   "extension  src/config.js        -> NOT $HOST"; failed=1
    fi
    if grep -n "\"https://ucp.animezone.me/\*\"" "$EXT_DIR/manifest.json" >/dev/null 2>&1; then
      green "extension  manifest permissions -> host allowed"
    else
      red   "extension  manifest permissions -> host NOT allowed (Chrome would block it)"; failed=1
    fi
    if grep -rn "vercel\.app" "$EXT_DIR/manifest.json" "$EXT_DIR/src/config.js" "$EXT_DIR/src/utils/api.js" >/dev/null 2>&1; then
      red   "extension  still references a second deployment (vercel.app)"; failed=1
    fi
  fi

  # 2) app: the default backend URL
  if [ -d "$APP_DIR" ]; then
    if grep -n "defaultValue: 'https://ucp.animezone.me'" \
        "$APP_DIR/lib/community/backend_config.dart" >/dev/null 2>&1; then
      green "app        backend_config.dart   -> $HOST"
    else
      red   "app        backend_config.dart   -> NOT $HOST"; failed=1
    fi
  fi

  # 3) the retired server must not be deployed from this workspace
  if [ -d "$WORKSPACE/extention-server" ]; then
    warn "note: extention-server/ is RETIRED — do not deploy it (merged into lib/ext/*)"
  fi

  return $failed
}

health_check() {
  local body
  body="$(curl -s --max-time 25 "$HOST/api/health")"
  echo "  health: $body"
  case "$body" in
    *'"ok":true'*) green "backend healthy at $HOST" ;;
    *) red "backend NOT healthy at $HOST"; return 1 ;;
  esac
  # the extension surface must answer with the shared key
  if [ -n "$API_KEY" ]; then
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 \
      -H "x-api-key: $API_KEY" \
      "$HOST/api/ext/leaderboard?courseName=Health+Check&source=extension")"
    if [ "$code" = "200" ]; then
      green "extension surface reachable (/api/ext/leaderboard -> 200)"
    else
      red "extension surface FAILED (/api/ext/leaderboard -> $code)"; return 1
    fi
  fi
}

if [ "${1:-}" != "--check" ]; then
  echo "→ deploying $APP_NAME to Heroku"
  git -C "$ROOT" push heroku main
  echo "→ waiting for the release"
  for i in $(seq 1 40); do
    if curl -s --max-time 10 "$HOST/api/health" | grep -q '"ok":true'; then
      green "release live"
      break
    fi
    sleep 3
  done
fi

echo "→ health"
health_check || exit 1

echo "→ client consistency"
check_clients || exit 1

green "single backend verified: $HOST"
