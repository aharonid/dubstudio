#!/bin/bash
set -e

# Deploy dub-audio edge function to Supabase
# This script requires Supabase CLI to be installed and authenticated
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Deploying dub-audio edge function..."
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI not found"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "ERROR: Not logged in to Supabase"
    echo "Run: supabase login"
    exit 1
fi

echo "Deploying function from: supabase/functions/dub-audio/index.ts"
echo ""

# Deploy the function
cd "$SCRIPT_DIR"
supabase functions deploy dub-audio --no-verify-jwt

echo ""
echo "Successfully deployed dub-audio edge function."
