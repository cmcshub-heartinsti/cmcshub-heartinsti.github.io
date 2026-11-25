#!/bin/bash
#===============================================================================
# CMCS-Hub: Serve the pre-built static site (no Hugo, no R required)
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

PUBLIC_DIR="$ROOT_DIR/CMCS-Hub/public"
PORT="${1:-8080}"

if [ ! -d "$PUBLIC_DIR" ]; then
    echo "ERROR: public/ not found."
    echo "Run 'bash scripts/03-build.sh' first to generate the static site."
    exit 1
fi

port_is_free() {
    local p=$1
    python3 -c "import socket; s=socket.socket(); s.bind(('0.0.0.0',$p)); s.close()" 2>/dev/null || {
        ss -tlnp 2>/dev/null | grep -q ":$p " && return 1
        lsof -i :$p 2>/dev/null | grep -q LISTEN && return 1
        return 1
    }
    return 0
}

ORIG_PORT=$PORT
while ! port_is_free "$PORT"; do
    echo "Port $PORT is in use, trying $((PORT + 1))..."
    PORT=$((PORT + 1))
done
[ "$PORT" != "$ORIG_PORT" ] && echo "Resolved to port: $PORT"

echo "========================================="
echo " CMCS-Hub: Static Site Server"
echo "========================================="
echo ""
echo "  URL:  http://localhost:$PORT"
echo "  Root: $PUBLIC_DIR"
echo ""
echo "  Press Ctrl+C to stop."
echo "========================================="

python3 -m http.server "$PORT" --directory "$PUBLIC_DIR" --bind 0.0.0.0
