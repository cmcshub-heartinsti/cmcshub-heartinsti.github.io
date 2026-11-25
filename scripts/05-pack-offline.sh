#!/bin/bash
#===============================================================================
# CMCS-Hub: Create offline migration package
# Bundles the conda environment + Hugo binary + source code + scripts
# into a single tarball for offline deployment.
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PKG_NAME="cmcs-hub-offline-v108.tar.gz"

echo "========================================="
echo " CMCS-Hub: Offline Package Builder"
echo "========================================="
echo ""

echo "[1/3] Packing conda environment (this may take a minute)..."
conda pack -n cmcs-hub -o "$ROOT_DIR/cmcs-hub-env.tar.gz" 2>&1 | tail -3

echo ""
echo "[2/3] Bundling all components..."
cd "$ROOT_DIR/.."
tar -czf "$ROOT_DIR/$PKG_NAME" \
    -C "$ROOT_DIR/.." "$(basename "$ROOT_DIR")/cmcs-hub-env.tar.gz" \
    -C "$ROOT_DIR/.." "$(basename "$ROOT_DIR")/CMCS-Hub" \
    -C "$ROOT_DIR/.." "$(basename "$ROOT_DIR")/hugo-bin" \
    -C "$ROOT_DIR/.." "$(basename "$ROOT_DIR")/scripts" \
    -C "$ROOT_DIR/.." "$(basename "$ROOT_DIR")/environment.yml"

rm -f "$ROOT_DIR/cmcs-hub-env.tar.gz"

echo ""
echo "[3/3] Organizing..."
mkdir -p "$ROOT_DIR/releases"
mv "$ROOT_DIR/$PKG_NAME" "$ROOT_DIR/releases/$PKG_NAME"

echo ""
echo "========================================="
echo " Offline package created!"
echo ""
echo "  File: releases/$PKG_NAME"
echo "  Size: $(du -h "$ROOT_DIR/releases/$PKG_NAME" | cut -f1)"
echo ""
echo " To install on target machine:"
echo "  bash scripts/01-setup-offline.sh releases/$PKG_NAME"
echo "========================================="
