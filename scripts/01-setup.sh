#!/bin/bash
#===============================================================================
# CMCS-Hub: Online environment setup
# Creates the cmcs-hub conda environment and verifies all dependencies.
# Run this first on any new machine with internet access.
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo " CMCS-Hub: Environment Setup (Online)"
echo "========================================="
echo ""

if [ ! -f "$ROOT_DIR/environment.yml" ]; then
    echo "ERROR: environment.yml not found in $ROOT_DIR"
    exit 1
fi

echo "[1/3] Creating conda environment 'cmcs-hub'..."
conda env create -f "$ROOT_DIR/environment.yml" 2>&1 || {
    echo "Environment may already exist. Updating..."
    conda env update -f "$ROOT_DIR/environment.yml" --prune
}

echo ""
echo "[2/3] Verifying R + blogdown..."
source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate cmcs-hub
R -e 'cat("  blogdown", as.character(packageVersion("blogdown")), "\n")'

echo ""
echo "[3/3] Verifying Hugo binary..."
if [ -x "$ROOT_DIR/hugo-bin/0.162.1/hugo" ]; then
    HUGO_VER=$("$ROOT_DIR/hugo-bin/0.162.1/hugo" version)
    echo "  $HUGO_VER"
else
    echo "  WARNING: hugo-bin/0.162.1/hugo not found."
    echo "  Copy a Hugo v0.120+ binary to: $ROOT_DIR/hugo-bin/0.162.1/hugo"
fi

echo ""
echo "========================================="
echo " Setup complete!"
echo ""
echo " Next steps:"
echo "   bash scripts/02-serve.sh       (development server)"
echo "   bash scripts/03-build.sh       (production build)"
echo "========================================="
