const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const { isValidUrl, formatSize, cleanupFile } = require('./utils');
const {
    detectPlatform,
    getPlatformInfo,
    getVideoInfo,
    downloadVideo,
    getSupportedPlatforms
} = require('./downloader');
const { trackUser, trackDownload, formatStatsMessage } = require('./stats');

// Store pending downloads (userId -> url)
const pendingDownloads = new Map();

/**
 * Create and configure the Telegram bot
 * @param {string} token - Bot token
 * @param {string} downloadDir - Download directory
 * @returns {TelegramBot}
 */
function createBot(token, downloadDir) {
    const bot = new TelegramBot(token, { polling: true });

    // /start command
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const welcomeMessage = `
🎬 *Video Downloader Bot*

Selamat datang! Saya bisa download video dari:

${getSupportedPlatforms()}

*Cara pakai:*
1️⃣ Kirim link video
2️⃣ Pilih kualitas (720p/1080p)
3️⃣ Tunggu video selesai didownload

Kirim /help untuk bantuan lebih lanjut.
    `.trim();

        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // /help command
    bot.onText(/\/help/, (msg) => {
        const chatId = msg.chat.id;
        const helpMessage = `
📖 *Panduan Penggunaan*

*Platform yang didukung:*
${getSupportedPlatforms()}

*Contoh link yang valid:*
• YouTube: \`https://youtube.com/watch?v=xxx\`
• TikTok: \`https://tiktok.com/@user/video/xxx\`
• Instagram: \`https://instagram.com/reel/xxx\`
• Facebook: \`https://fb.watch/xxx\`
• Twitter: \`https://twitter.com/user/status/xxx\`

*Pilihan kualitas:*
• 720p - Ukuran lebih kecil, download lebih cepat
• 1080p - Kualitas lebih tinggi

*Batas ukuran:* Maksimal 50MB (limit Telegram)
    `.trim();

        bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // /stats command
    bot.onText(/\/stats/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, formatStatsMessage(), { parse_mode: 'Markdown' });
    });

    // Handle incoming URLs
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        // Skip commands
        if (!text || text.startsWith('/')) return;

        // Check if it's a valid URL
        if (!isValidUrl(text)) return;

        const url = text.trim();
        const platform = detectPlatform(url);

        if (!platform) {
            bot.sendMessage(chatId, '❌ Platform tidak didukung. Kirim /help untuk melihat platform yang didukung.');
            return;
        }

        const platformInfo = getPlatformInfo(platform);

        // Track user
        trackUser(msg.from.id);

        // Store URL and platform for this user
        pendingDownloads.set(chatId, { url, platform });

        // Send initial message
        const loadingMsg = await bot.sendMessage(chatId, `${platformInfo.emoji} *${platformInfo.name}* terdeteksi!\n\n⏳ Mengambil info video...`, { parse_mode: 'Markdown' });

        try {
            // Get video info including sizes
            const videoInfo = await getVideoInfo(url);

            // Format sizes for buttons
            const formatSize = (bytes) => {
                if (!bytes) return '';
                const mb = bytes / (1024 * 1024);
                return ` (~${mb.toFixed(1)}MB)`;
            };

            const size720Text = formatSize(videoInfo.size720);
            const size1080Text = formatSize(videoInfo.size1080);

            // Send quality selection with sizes
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: `📹 720p${size720Text}`, callback_data: 'quality_720' },
                        { text: `📹 1080p${size1080Text}`, callback_data: 'quality_1080' }
                    ]
                ]
            };

            bot.editMessageText(
                `${platformInfo.emoji} *${platformInfo.name}* terdeteksi!\n\n📝 *${videoInfo.title}*\n\nPilih kualitas video:`,
                {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
        } catch (error) {
            // Fallback to simple buttons if info fetch fails
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '📹 720p', callback_data: 'quality_720' },
                        { text: '📹 1080p', callback_data: 'quality_1080' }
                    ]
                ]
            };

            bot.editMessageText(
                `${platformInfo.emoji} *${platformInfo.name}* terdeteksi!\n\nPilih kualitas video:`,
                {
                    chat_id: chatId,
                    message_id: loadingMsg.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
        }
    });

    // Handle quality selection callback
    bot.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const data = query.data;

        // Answer callback to remove loading state
        bot.answerCallbackQuery(query.id);

        if (!data.startsWith('quality_')) return;

        const quality = data.replace('quality_', '');
        const pendingData = pendingDownloads.get(chatId);

        if (!pendingData) {
            bot.sendMessage(chatId, '❌ Session expired. Silakan kirim ulang link video.');
            return;
        }

        const { url, platform } = pendingData;

        // Remove from pending
        pendingDownloads.delete(chatId);

        // Update message to show downloading status
        bot.editMessageText(
            `⏳ *Downloading...* (${quality}p)\n\nMohon tunggu, ini mungkin memakan waktu beberapa saat.`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
            }
        );

        try {
            // Download video (platform passed for conditional re-encoding)
            const result = await downloadVideo(url, quality, downloadDir, platform, (progress) => {
                // Update progress (optional, might cause rate limiting)
                bot.editMessageText(
                    `⏳ *Downloading...* (${quality}p)\n\nProgress: ${progress}%`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown'
                    }
                ).catch(() => { }); // Ignore edit errors
            });

            // Check file size (Telegram limit is 50MB for bots)
            const MAX_SIZE = 50 * 1024 * 1024; // 50MB
            if (result.size > MAX_SIZE) {
                cleanupFile(result.path);
                bot.editMessageText(
                    `❌ *File terlalu besar*\n\nUkuran: ${formatSize(result.size)}\nMaksimal: 50MB\n\nCoba gunakan kualitas 720p.`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: 'Markdown'
                    }
                );
                return;
            }

            // Update message
            bot.editMessageText(
                `📤 *Mengirim video...* (${formatSize(result.size)})`,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown'
                }
            );

            // Send video
            await bot.sendVideo(chatId, result.path, {
                caption: `✅ Downloaded (${quality}p) - ${formatSize(result.size)}`
            });

            // Track successful download
            trackDownload(platform);

            // File will be auto-deleted after 1 hour by cleanup scheduler

            // Delete status message
            bot.deleteMessage(chatId, messageId).catch(() => { });

        } catch (error) {
            console.error('Download error:', error);

            let errorMessage = '❌ *Gagal download video*\n\n';

            if (error.message.includes('yt-dlp not found')) {
                errorMessage += 'yt-dlp belum terinstall di server.';
            } else if (error.message.includes('Private video') || error.message.includes('Video unavailable')) {
                errorMessage += 'Video tidak tersedia atau bersifat private.';
            } else if (error.message.includes('login required') || error.message.includes('rate-limit')) {
                errorMessage += 'Instagram membutuhkan login. Coba lagi nanti atau gunakan link yang berbeda.';
            } else if (error.message.includes('No video could be found')) {
                errorMessage += 'Tidak ada video ditemukan di tweet ini.';
            } else if (error.message.includes('Sign in to confirm')) {
                errorMessage += 'Twitter membutuhkan login untuk video ini.';
            } else if (error.message.includes('Unsupported URL') && error.message.includes('facebook.com/stories')) {
                errorMessage += 'Facebook Stories belum didukung. Gunakan link Reels atau video biasa.';
            } else if (error.message.includes('Unsupported URL')) {
                errorMessage += 'Format URL tidak didukung.';
            } else if (error.message.includes('login.php')) {
                errorMessage += 'Facebook membutuhkan login. Pastikan cookies sudah dikonfigurasi.';
            } else {
                errorMessage += 'Terjadi kesalahan. Pastikan link valid dan video bisa diakses.';
            }

            bot.editMessageText(
                errorMessage,
                {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'Markdown'
                }
            );
        }
    });

    // Error handling
    bot.on('polling_error', (error) => {
        console.error('Polling error:', error.message);
    });

    console.log('🤖 Bot is running...');

    return bot;
}

module.exports = { createBot };
