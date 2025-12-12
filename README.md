# 🎬 Telegram Video Downloader Bot

Bot Telegram untuk download video dari YouTube, TikTok, Instagram, Facebook, dan Twitter/X.

## ✨ Fitur

- 🔴 **YouTube** - Video & Shorts
- 🎵 **TikTok** - Video tanpa watermark
- 📸 **Instagram** - Reels & Video
- 🔵 **Facebook** - Video & Reels
- 🐦 **Twitter/X** - Video

- 📹 Pilihan kualitas: **720p** / **1080p**
- ⚡ Progress indicator
- 🧹 Auto cleanup file

## 📋 Prerequisites

### 1. Node.js
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. yt-dlp
```bash
# Install via pip
pip install yt-dlp

# Atau via binary
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 3. FFmpeg
```bash
sudo apt install ffmpeg
```

## 🚀 Setup

### 1. Clone & Install
```bash
cd /www/wwwroot/video-downloader  # atau path lain
git clone https://github.com/mazbron/video-downloader.git .
npm install
```

### 2. Buat Bot Token
1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Ikuti instruksi (nama bot, username)
4. Copy token yang diberikan

### 3. Konfigurasi
```bash
cp .env.example .env
nano .env
```

Isi dengan token:
```env
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
DOWNLOAD_DIR=./downloads
```

### 4. Jalankan
```bash
# Development
npm run dev

# Production (dengan PM2)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📱 Cara Pakai

1. Buka bot di Telegram
2. Kirim `/start`
3. Kirim link video (YouTube, TikTok, Instagram, Facebook, Twitter)
4. Pilih kualitas (720p / 1080p)
5. Tunggu video selesai didownload

## 🖥️ Deploy di aaPanel VPS

### Install Prerequisites via SSH
```bash
# Update system
apt update && apt upgrade -y

# Install yt-dlp
pip install yt-dlp

# Install ffmpeg
apt install ffmpeg -y

# Install PM2
npm install -g pm2
```

### Setup di aaPanel
1. **Website** → Add site (opsional, untuk domain)
2. **Terminal** → Jalankan setup commands
3. Clone repo ke `/www/wwwroot/video-downloader`
4. Setup `.env` dengan bot token
5. Jalankan dengan PM2

### PM2 Commands
```bash
pm2 start ecosystem.config.js   # Start
pm2 stop video-downloader-bot   # Stop
pm2 restart video-downloader-bot # Restart
pm2 logs video-downloader-bot   # View logs
pm2 monit                       # Monitor
```

## 📁 Struktur Project

```
├── package.json
├── ecosystem.config.js    # PM2 config
├── .env                   # Bot token (jangan commit!)
├── .env.example
├── src/
│   ├── index.js          # Entry point
│   ├── bot.js            # Telegram bot logic
│   ├── downloader.js     # yt-dlp wrapper
│   └── utils.js          # Helper functions
└── downloads/            # Temp download folder
```

## ⚠️ Troubleshooting

### "yt-dlp not found"
```bash
which yt-dlp  # Check installation
pip install --upgrade yt-dlp
```

### "Video terlalu besar"
- Telegram limit 50MB untuk bot
- Gunakan kualitas 720p untuk video panjang

### "Video tidak tersedia"
- Pastikan video tidak private
- Cek ulang URL

## 📄 License

MIT
# video-downloader
# video-downloader
