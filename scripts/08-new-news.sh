#!/bin/bash
#===============================================================================
# CMCS-Hub: Scaffold a new news/events post
# Usage: bash scripts/08-new-news.sh "Title of Your Post" [date] [tags]
#   title:  required - the post title
#   date:   optional - YYYY-MM-DD (default: today)
#   tags:   optional - "news" or "event" (default: news)
#===============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

TITLE="${1:-}"
DATE="${2:-$(date +%Y-%m-%d)}"
TAGS="${3:-news}"

if [ -z "$TITLE" ]; then
    echo "Usage: bash scripts/08-new-news.sh \"Title of Your Post\" [YYYY-MM-DD] [news|event]"
    echo ""
    echo "Examples:"
    echo "  bash scripts/08-new-news.sh \"New Paper Published\""
    echo "  bash scripts/08-new-news.sh \"Upcoming Conference\" 2026-07-15 event"
    exit 1
fi

# Generate a slug from the title (lowercase, replace spaces with hyphens, remove special chars)
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
FILE="$ROOT_DIR/CMCS-Hub/content/news/${DATE}-${SLUG}.md"

if [ -f "$FILE" ]; then
    echo "ERROR: File already exists: $FILE"
    exit 1
fi

cat > "$FILE" << EOF
---
title: "${TITLE}"
date: ${DATE}
author: "CMCS-Hub Team"
tags: ["${TAGS}"]
---

EOF

echo "Created: $FILE"
echo ""
echo "Edit this file to add content, then rebuild:"
echo "  ./hugo-bin/0.162.1/hugo --source CMCS-Hub --cleanDestinationDir"
