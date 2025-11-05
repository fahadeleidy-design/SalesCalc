#!/bin/bash

# SalesCalc - Deployment Commands
# Run these commands to deploy to Netlify

echo "🚀 Deploying SalesCalc to Netlify..."
echo ""

# Step 1: Add all changes
echo "📦 Step 1: Adding all changes..."
git add .

# Step 2: Commit changes
echo "💾 Step 2: Committing changes..."
git commit -m "Fix: Update Node version to 20 and regenerate package-lock.json for Netlify deployment"

# Step 3: Push to GitHub
echo "⬆️  Step 3: Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Netlify will now automatically deploy your site."
echo ""
echo "📊 Monitor your deployment at:"
echo "   https://app.netlify.com/sites/YOUR-SITE-NAME/deploys"
echo ""
echo "⏱️  Expected deployment time: 1-2 minutes"
echo ""
