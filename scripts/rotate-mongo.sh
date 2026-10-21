#!/usr/bin/env bash
# Rotates the MongoDB Atlas password for the live app and updates Heroku.
#
#   scripts/rotate-mongo.sh            # generate + verify + deploy
#   scripts/rotate-mongo.sh <password> # rotate to a chosen password
#
# STEP 1 (you, in Atlas) is the only manual step: Mongo refuses password
# changes from a user that lacks the userAdmin role, and the app's user
# is deliberately data-only. Do it here:
#
#   Atlas -> Database Access -> msaadakram786_db_user2 -> Edit
#       -> Set a new password (use the generated one, or your own)
#       -> Update
#
# STEP 2 (this script): verify the new password works, update Heroku,
# restart, and confirm the app still answers /api/health.

set -euo pipefail

APP="${APP_NAME:-ucp-campus-community}"
NEW_PASSWORD="${1:-$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)}"

# --- rebuild the URI with the new password (structure untouched) ---
CURRENT_URI="$(heroku config:get MONGODB_URI --app "$APP")"
[ -z "$CURRENT_URI" ] && { echo "MONGODB_URI not found for $APP"; exit 1; }

NEW_URI="$(node -e '
const u = new URL(process.argv[1]);
u.username = u.username;
u.password = encodeURIComponent(process.argv[2]);
process.stdout.write(u.toString());
' "$CURRENT_URI" "$NEW_PASSWORD")"

USER_NAME="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(u.username)' "$CURRENT_URI")"
HOSTNAME="$(node -e 'const u = new URL(process.argv[1]); process.stdout.write(u.hostname.split(",")[0])' "$CURRENT_URI")"

echo
echo "  Mongo user : $USER_NAME @ $HOSTNAME"
echo "  New password generated (${#NEW_PASSWORD} chars)."

# --- STEP 1 done by you in Atlas; verify it here ---
echo
echo "  Verifying the new password against Atlas… (set it in Atlas first)"
if TEST_URI="$NEW_URI" node --eval '
const mongoose = require("mongoose");
mongoose.connect(process.env.TEST_URI, { serverSelectionTimeoutMS: 20000 })
  .then(() => mongoose.connection.db.command({ ping: 1 }))
  .then(() => { console.log("    credentials OK"); process.exit(0); })
  .catch((e) => { console.error("    credentials FAILED: " + e.message.split("\n")[0]); process.exit(1); });
'; then
  echo
  echo "  Updating Heroku config…"
  heroku config:set MONGODB_URI="$NEW_URI" --app "$APP"
  echo "  Waiting for the release…"
  for i in $(seq 1 40); do
    if curl -s --max-time 10 "https://ucp.animezone.me/api/health" | grep -q '"ok":true'; then
      echo "  OK — the live app is healthy with the new password."
      break
    fi
    sleep 3
  done
  # The vault key is independent of this change; confirm both are present.
  heroku config --app "$APP" -s | sed 's/=.*/=<set>/' | grep -E "MONGODB_URI|COOKIE_VAULT_KEY" | sed 's/^/  /'
else
  echo
  echo "  !! The new password is not active yet in Atlas."
  echo "     Set it in Atlas -> Database Access -> Edit user, then re-run:"
  echo "       scripts/rotate-mongo.sh '$NEW_PASSWORD'"
  exit 1
fi
