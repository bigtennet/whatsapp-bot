#!/bin/bash

echo "🚀 Starting deployment process..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first."
    exit 1
fi

# Add all changes
echo "📁 Adding all changes to git..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "✅ No changes to commit."
else
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "Enhanced bot with improved connection handling and health checks - $(date)"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🎉 Deployment Summary:"
    echo "• Enhanced connection handling for Render"
    echo "• Improved keep-alive mechanism (2-minute heartbeats)"
    echo "• Better error recovery and reconnection logic"
    echo "• Memory monitoring and automatic restart"
    echo "• Health check server for monitoring"
    echo "• Graceful shutdown handling"
    echo ""
    echo "🔗 Your bot should automatically redeploy on Render!"
    echo "📊 Monitor the deployment at: https://dashboard.render.com"
    echo "🏥 Health check available at: https://your-app-name.onrender.com/health"
else
    echo "❌ Failed to push to GitHub. Please check your git configuration."
    exit 1
fi 