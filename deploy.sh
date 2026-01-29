#!/bin/bash

# Vercel Deployment Helper Script for Lockstep

set -e

echo "🚀 Lockstep Deployment Helper"
echo "=============================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Install it with:"
    echo "   npm install -g vercel"
    echo ""
fi

echo "📦 Step 1: Deploy Supabase Edge Functions"
echo "----------------------------------------"
echo ""

read -p "Deploy edge functions to Supabase? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying functions..."
    cd supabase/functions
    for func in */; do
        func_name="${func%/}"
        echo "  → Deploying $func_name"
        supabase functions deploy "$func_name"
    done
    cd ../..
    echo "✅ Edge functions deployed!"
else
    echo "⏭️  Skipping edge function deployment"
fi

echo ""
echo "🌐 Step 2: Deploy to Vercel"
echo "--------------------------"
echo ""

if command -v vercel &> /dev/null; then
    read -p "Deploy to Vercel now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deploying to Vercel..."
        vercel --prod
        echo "✅ Deployed to Vercel!"
    else
        echo "⏭️  Skipping Vercel deployment"
        echo "   Run 'vercel --prod' when ready"
    fi
else
    echo "⏭️  Vercel CLI not installed"
    echo "   Install: npm install -g vercel"
    echo "   Or deploy via: https://vercel.com/new"
fi

echo ""
echo "✨ Next Steps:"
echo "  1. Set environment variables in Vercel:"
echo "     - VITE_SUPABASE_URL"
echo "     - VITE_SUPABASE_ANON_KEY"
echo ""
echo "  2. Get credentials from: https://app.supabase.com"
echo "     Settings → API"
echo ""
echo "  3. Read full deployment guide: DEPLOYMENT.md"
echo ""
echo "🎉 Happy deploying!"
