#!/bin/bash

# Video Downloader Bot - Update Script
# Usage: ./update.sh

echo "🔄 Updating Video Downloader Bot..."
echo ""

# Navigate to project directory
cd /www/wwwroot/video-downloader || {
    echo "❌ Error: Directory not found!"
    echo "Make sure the bot is installed in /www/wwwroot/video-downloader"
    exit 1
}

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull

# Check if pull was successful
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed!"
    exit 1
fi

# Install dependencies (in case there are new ones)
echo "📦 Checking dependencies..."
npm install --production

# Restart bot
echo "🔄 Restarting bot..."
pm2 restart video-downloader-bot

# Show status
echo ""
echo "✅ Update complete!"
echo ""
pm2 status video-downloader-bot
