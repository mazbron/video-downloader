#!/bin/bash

# Video Downloader Bot - Install Script for aaPanel VPS
# Usage: curl -sL https://raw.githubusercontent.com/mazbron/video-downloader/main/install.sh | bash

echo "🚀 Installing Video Downloader Bot..."
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Please run with sudo: sudo bash install.sh"
    exit 1
fi

# Install yt-dlp
echo "📦 Installing yt-dlp..."
pip3 install yt-dlp || pip install yt-dlp

# Install ffmpeg (if not installed)
echo "📦 Installing ffmpeg..."
apt install ffmpeg -y 2>/dev/null || yum install ffmpeg -y 2>/dev/null

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Create directory
echo "📁 Setting up project directory..."
mkdir -p /www/wwwroot/video-downloader
cd /www/wwwroot/video-downloader

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/mazbron/video-downloader.git .

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Create .env file
echo ""
echo "⚙️  Setup required!"
echo ""
read -p "Enter your Telegram Bot Token: " BOT_TOKEN

echo "BOT_TOKEN=$BOT_TOKEN" > .env
echo "DOWNLOAD_DIR=./downloads" >> .env

# Start with PM2
echo "🚀 Starting bot..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "✅ Installation complete!"
echo ""
echo "📍 Bot location: /www/wwwroot/video-downloader"
echo "📋 Commands:"
echo "   pm2 status              - Check status"
echo "   pm2 logs                - View logs"
echo "   pm2 restart video-downloader-bot - Restart"
echo "   ./update.sh             - Update to latest version"
echo ""
