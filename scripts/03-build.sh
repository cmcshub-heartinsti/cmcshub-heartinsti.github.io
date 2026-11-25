#!/bin/bash
#===============================================================================
# CMCS-Hub: Production build
# Generates a fully static site under CMCS-Hub/public/.
# Requires: conda environment 'cmcs-hub' (run 01-setup.sh first).
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "========================================="
echo " CMCS-Hub: Production Build"
echo "========================================="

source "$(conda info --base)/etc/profile.d/conda.sh"
conda activate cmcs-hub

cd "$ROOT_DIR/CMCS-Hub"
R -e 'options(blogdown.hugo.dir = "../hugo-bin/0.162.1"); blogdown::build_site(build_rmd = FALSE)'

echo ""
echo "Site built to: $ROOT_DIR/CMCS-Hub/public/"
echo "Deploy the contents of 'public/' to your web server."
echo ""
echo "To preview locally:"
echo "  bash scripts/04-serve-static.sh"
