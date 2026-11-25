#!/bin/bash
#===============================================================================
# CMCS-Hub: Fetch the pinned Hugo binary (idempotent)
#
# Downloads Hugo extended 0.162.1 (linux/amd64) into hugo-bin/0.162.1/hugo.
# hugo-bin/ is git-ignored on purpose: the binary is 96 MB and GitHub rejects
# files larger than 100 MB (50 MB triggers a warning). CI installs its own copy.
#
# Usage:
#   bash scripts/00-get-hugo.sh
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION="0.162.1"
DEST="$ROOT_DIR/hugo-bin/$VERSION/hugo"

echo "========================================="
echo " CMCS-Hub: Hugo $VERSION"
echo "========================================="

if [ -x "$DEST" ] && "$DEST" version 2>/dev/null | grep -q "$VERSION"; then
    echo "  Already present: $DEST"
    "$DEST" version
    exit 0
fi

if [ "$(uname -s)" != "Linux" ]; then
    echo "ERROR: this script downloads the linux-amd64 build."
    echo "  Download Hugo $VERSION (extended) for your OS and place it at:"
    echo "  $DEST"
    exit 1
fi

URL="https://github.com/gohugoio/hugo/releases/download/v${VERSION}/hugo_extended_${VERSION}_linux-amd64.tar.gz"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$(dirname "$DEST")"
echo "  Downloading $URL ..."
if ! curl -fsSL "$URL" | tar xz -C "$TMP_DIR" hugo; then
    echo "ERROR: download or extraction failed."
    echo "  Manual fallback (any machine with network access):"
    echo "    1) download: $URL"
    echo "    2) extract the 'hugo' file to: $DEST"
    exit 1
fi

install -m 0755 "$TMP_DIR/hugo" "$DEST"
echo "  Installed: $DEST"
"$DEST" version
