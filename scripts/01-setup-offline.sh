#!/bin/bash
#===============================================================================
# CMCS-Hub: Offline environment setup
# Installs from a pre-packaged cmcs-hub-offline-v*.tar.gz archive.
# Usage: bash 01-setup-offline.sh [/path/to/cmcs-hub-offline-v108.tar.gz]
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ARCHIVE="${1:-$ROOT_DIR/releases/cmcs-hub-offline-v108.tar.gz}"

echo "========================================="
echo " CMCS-Hub: Environment Setup (Offline)"
echo "========================================="
echo ""

if [ ! -f "$ARCHIVE" ]; then
    echo "ERROR: Archive not found: $ARCHIVE"
    echo "Usage: bash $(basename "$0") /path/to/cmcs-hub-offline-v108.tar.gz"
    exit 1
fi

echo "Source: $ARCHIVE"
echo ""

echo "[1/2] Extracting archive..."
tar -xzf "$ARCHIVE"

echo "[2/2] Installing conda environment..."
mkdir -p "$(conda info --base)/envs/cmcs-hub"
tar -xzf cmcs-hub-package/cmcs-hub-env.tar.gz -C "$(conda info --base)/envs/cmcs-hub"
source "$(conda info --base)/envs/cmcs-hub/bin/activate"
conda-unpack

echo ""
echo "========================================="
echo " Offline setup complete!"
echo ""
echo " Next steps:"
echo "   conda activate cmcs-hub"
echo "   bash cmcs-hub-package/scripts/02-serve.sh"
echo "========================================="
