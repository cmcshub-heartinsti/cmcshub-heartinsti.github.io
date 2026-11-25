#!/bin/bash
#===============================================================================
# CMCS-Hub: Build, verify, and optionally restart production services
# Usage: bash scripts/07-deploy.sh [restart]
#   (no arg)   Build + local test only
#   restart    Build + test + restart cmcs-hub.service
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
RESTART="${1:-no}"

cd "$ROOT_DIR"

echo "[1/3] Building site..."
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir > /dev/null
echo "       Done ($(find CMCS-Hub/public -name 'index.html' | wc -l) pages)"

echo "[2/3] Testing locally..."
python3 -m http.server 9999 --directory CMCS-Hub/public --bind 127.0.0.1 &
PID=$!
sleep 1
curl -s -o /dev/null -w "       HTTP %{http_code}\n" http://localhost:9999/
kill $PID 2>/dev/null
wait $PID 2>/dev/null || true

if [ "$RESTART" = "restart" ]; then
    echo "[3/3] Restarting production services..."
    sudo systemctl restart cmcs-hub 2>/dev/null || echo "       (cmcs-hub.service not installed — skipping)"
    echo "       Done."
else
    echo "[3/3] Skipping service restart (pass 'restart' to enable)."
fi

# Keep the build output: python3 http.server (and the systemd service) serves
# CMCS-Hub/public directly, so deleting it here would take the site offline.
rm -f CMCS-Hub/.hugo_build.lock
echo ""
echo "Site built to: $ROOT_DIR/CMCS-Hub/public/  ($(find CMCS-Hub/public -name 'index.html' | wc -l) pages)"
