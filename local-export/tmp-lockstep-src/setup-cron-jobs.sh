#!/bin/bash

# Cron Jobs Setup Script
# This script helps you set up cron jobs for Supabase Edge Functions

echo "================================================"
echo "Supabase Cron Jobs Setup"
echo "================================================"
echo ""
echo "Your SQL file is ready at: supabase/cron-jobs.sql"
echo ""
echo "To complete setup, follow these steps:"
echo ""
echo "1. Open Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/pirhugiuguaahvvxifpu/sql/new"
echo ""
echo "2. Copy the entire contents of supabase/cron-jobs.sql"
echo "   (The file should already have your SWEEP_SECRET in place)"
echo ""
echo "3. Paste into the SQL Editor and click 'Run'"
echo ""
echo "4. Verify jobs are created by running:"
echo "   SELECT * FROM cron.job;"
echo ""
echo "================================================"
echo "Your SQL file preview:"
echo "================================================"
cat supabase/cron-jobs.sql | head -n 30
echo ""
echo "... (see full file for complete SQL)"
echo ""
echo "================================================"
echo "Next: Copy supabase/cron-jobs.sql and run in Dashboard"
echo "================================================"
