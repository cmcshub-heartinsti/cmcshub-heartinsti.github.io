#!/bin/bash
#===============================================================================
# CMCS-Hub: Temporary public deployment via Cloudflare Tunnel
# Usage: bash scripts/06-start-public.sh [port]
# Uses the bundled hugo-bin/cloudflared-linux-amd64 binary. No conda, no R.
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${1:-9000}"

CF_BIN="$ROOT_DIR/hugo-bin/cloudflared-linux-amd64"

cd "$ROOT_DIR"

cleanup() {
    echo ""
    echo "Stopping services..."
    [ -n "${SERVER_PID:-}" ] && kill "$SERVER_PID" 2>/dev/null || true
    echo "Stopped."
}
trap cleanup INT TERM

# ── Step 1: Build ──
echo "========================================="
echo " CMCS-Hub: Cloudflare Tunnel Deploy"
echo "========================================="
echo ""
echo "[1/3] Building site..."
./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir > /dev/null
echo "       Done."

# ── Step 2: Port check + start server ──
echo "[2/3] Starting local server..."

resolve_port() {
    local p=$1
    while ! python3 -c "import socket; s=socket.socket(); s.bind(('127.0.0.1',$p)); s.close()" 2>/dev/null; do
        echo "       Port $p is in use, trying $((p + 1))..."
        p=$((p + 1))
    done
    echo "$p"
}

PORT=$(resolve_port "$PORT")

python3 -m http.server "$PORT" --directory CMCS-Hub/public --bind 127.0.0.1 &
SERVER_PID=$!
sleep 2

curl -s -o /dev/null -w "       HTTP %{http_code} on port $PORT\n" "http://localhost:$PORT/"
echo "       Server PID: $SERVER_PID"

# ── Step 3: Start Cloudflare Tunnel (foreground, direct output) ──
echo "[3/3] Starting Cloudflare Tunnel..."
echo ""

if [ ! -x "$CF_BIN" ]; then
    echo "ERROR: $CF_BIN not found."
    echo ""
    echo "Download it:"
    echo "  curl -L -o cloudflared-linux-amd64 https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
    echo "  chmod +x cloudflared-linux-amd64"
    echo "  mv cloudflared-linux-amd64 $CF_BIN"
    exit 1
fi

# Clean stale credentials to ensure a fresh quick tunnel each time
rm -rf ~/.cloudflared/ 2>/dev/null || true

# api.trycloudflare.com rate-limits quick tunnels from shared IPs (HTTP 429,
# Cloudflare error 1015); cloudflared then dies with
# "failed to parse quick Tunnel ID: invalid UUID length: 0". Retry a few times.
URL=""
CF_PID=""
for attempt in 1 2 3 4 5 6; do
    LOG="$ROOT_DIR/.tunnel.log"
    : > "$LOG"
    "$CF_BIN" tunnel --url "http://localhost:$PORT" --protocol http2 --no-autoupdate > "$LOG" 2>&1 &
    CF_PID=$!
    for _ in $(seq 1 30); do
        URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" 2>/dev/null | head -1 || true)
        [ -n "$URL" ] && break
        grep -q 'failed to parse quick Tunnel ID' "$LOG" 2>/dev/null && break
        kill -0 "$CF_PID" 2>/dev/null || break
        sleep 1
    done
    if [ -n "$URL" ]; then
        echo ""
        echo "========================================="
        echo " Public URL: $URL"
        echo "========================================="
        echo ""
        echo " (Ctrl+C to stop. The URL is temporary and changes every run.)"
        # Written where the operation guide tells people to look for it.
        echo "$URL" > "$ROOT_DIR/CMCS-Hub-Internet-Accessible-Website.txt"
        echo "$URL" > "$ROOT_DIR/.tunnel-url.txt"
        break
    fi
    echo "       Cloudflare rate-limited the quick tunnel (429/1015). Retry $attempt/6 in 20s..."
    kill "$CF_PID" 2>/dev/null || true
    wait "$CF_PID" 2>/dev/null || true
    CF_PID=""
    sleep 20
done

if [ -z "$URL" ]; then
    echo "ERROR: could not create a Cloudflare quick tunnel (rate limited)."
    echo "       Try again in a few minutes, or use a named tunnel with an account:"
    echo "       https://developers.cloudflare.com/cloudflare-one/connections/connect-apps"
    cleanup
    exit 1
fi

trap 'kill "$CF_PID" 2>/dev/null || true; cleanup' INT TERM
wait "$CF_PID" || true

cleanup
