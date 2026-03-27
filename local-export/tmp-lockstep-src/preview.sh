#!/bin/bash

# Local Preview Script - Test your build before deploying

set -e

echo "🔨 Building application..."
pnpm build

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Build output:"
ls -lh dist/public/

echo ""
echo "📦 Files in dist/public/:"
echo "  - index.html: $(ls -lh dist/public/index.html | awk '{print $5}')"
echo "  - assets/: $(ls dist/public/assets/ | wc -l) files"

echo ""
echo "🌐 Starting preview server..."
echo "   Preview will be available at: http://localhost:4173"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""

pnpm preview
