#!/bin/bash
#===============================================================================
# CMCS-Hub: Development server with hot-reload
# Starts blogdown::serve_site() — edits to .md files auto-refresh in browser.
# Requires: conda environment 'cmcs-hub' (run 01-setup.sh first).
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo " CMCS-Hub: Development Server"
echo "========================================="

source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate cmcs-hub

cd "$ROOT_DIR/CMCS-Hub"
R -e 'options(blogdown.hugo.dir = "../hugo-bin/0.162.1"); blogdown::serve_site()'
