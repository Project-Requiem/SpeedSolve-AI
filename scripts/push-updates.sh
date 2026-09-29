#!/bin/bash
# SpeedSolve AI - Push Updates Script
# This script pushes the v0.3.0 update with 5 AI providers and 10 addictive features
#
# Usage: ./scripts/push-updates.sh <GITHUB_PAT>
# Where GITHUB_PAT is your GitHub Personal Access Token with repo push permissions
# Create one at: https://github.com/settings/tokens/new (select "repo" scope)

if [ -z "$1" ]; then
    echo "❌ Usage: $0 <GITHUB_PAT>"
    echo "Create a PAT at: https://github.com/settings/tokens/new"
    exit 1
fi

TOKEN="$1"
REPO="Project-Requiem/SpeedSolve-AI"
BRANCH="main"

cd /home/z/my-project

# Set up credentials
git remote set-url origin "https://x-access-token:${TOKEN}@github.com/${REPO}.git"

# Push
git push origin main

echo "✅ Pushed successfully!"
echo "🚀 Vercel will auto-deploy from GitHub."
