#!/bin/bash
# 🚀 Dist Optimization Script for LeadCop
# This script post-processes the build output for maximum performance.

DIST_DIR="/var/www/leadcop.io/artifacts/tempshield/dist/public"
INDEX_HTML="$DIST_DIR/index.html"

echo "📦 Optimizing build output in $DIST_DIR..."

if [ ! -f "$INDEX_HTML" ]; then
    echo "❌ Error: index.html not found in $DIST_DIR"
    exit 1
fi

# 1. Make main CSS non-blocking
# Find: <link rel="stylesheet" crossorigin href="/assets/index-HASH.css">
# Replace with: <link rel="preload" href="/assets/index-HASH.css" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="/assets/index-HASH.css"></noscript>
echo "⚡ Making CSS non-blocking..."
sed -i 's/<link rel="stylesheet" crossorigin href="\/assets\/index-\([^"]*\)\.css">/ \
<link rel="preload" href="\/assets\/index-\1.css" as="style" onload="this.onload=null;this.rel='\''stylesheet'\''"> \
<noscript><link rel="stylesheet" href="\/assets\/index-\1.css"><\/noscript>/g' "$INDEX_HTML"

# 2. Pre-compress assets (Gzip and Brotli)
# We compress all JS, CSS, SVG, and HTML files.
echo "🗜️ Pre-compressing assets..."
find "$DIST_DIR" -type f \( -name "*.js" -o -name "*.css" -o -name "*.svg" -o -name "*.html" \) | while read -r file; do
    # Only compress if it's larger than 1KB
    if [ $(stat -c%s "$file") -gt 1024 ]; then
        # Gzip
        gzip -k -f -9 "$file"
        # Brotli (if available)
        if command -v brotli >/dev/null 2>&1; then
            brotli -k -f --best "$file"
        fi
    fi
done

echo "✅ Optimization complete."
