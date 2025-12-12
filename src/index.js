require('dotenv').config();
const path = require('path');
const { createBot } = require('./bot');
const { ensureDir, startCleanupScheduler } = require('./utils');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || './downloads';

// Validate bot token
if (!BOT_TOKEN || BOT_TOKEN === 'your_telegram_bot_token_here') {
    console.error('❌ Error: BOT_TOKEN tidak ditemukan!');
    console.error('');
    console.error('Cara mendapatkan token:');
    console.error('1. Buka Telegram, cari @BotFather');
    console.error('2. Kirim /newbot dan ikuti instruksi');
    console.error('3. Copy token yang diberikan');
    console.error('4. Buat file .env dan isi: BOT_TOKEN=your_token_here');
    console.error('');
    process.exit(1);
}

// Ensure download directory exists
const downloadPath = path.resolve(DOWNLOAD_DIR);
ensureDir(downloadPath);

// Start bot
console.log('🚀 Starting Telegram Video Downloader Bot...');
console.log(`📁 Download directory: ${downloadPath}`);
console.log('');

createBot(BOT_TOKEN, downloadPath);

// Start auto cleanup (delete files older than 1 hour)
startCleanupScheduler(downloadPath);
