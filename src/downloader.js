const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ensureDir, generateFilename } = require('./utils');

// Platform patterns for URL detection
const PLATFORM_PATTERNS = {
    youtube: /(?:youtube\.com|youtu\.be)/i,
    tiktok: /tiktok\.com/i,
    instagram: /instagram\.com/i,
    facebook: /(?:facebook\.com|fb\.watch|fb\.com)/i,
    twitter: /(?:twitter\.com|x\.com)/i
};

// Platform display names and emojis
const PLATFORM_INFO = {
    youtube: { name: 'YouTube', emoji: '🔴' },
    tiktok: { name: 'TikTok', emoji: '🎵' },
    instagram: { name: 'Instagram', emoji: '📸' },
    facebook: { name: 'Facebook', emoji: '🔵' },
    twitter: { name: 'Twitter/X', emoji: '🐦' }
};

/**
 * Detect platform from URL
 * @param {string} url - Video URL
 * @returns {string|null} Platform name or null
 */
function detectPlatform(url) {
    for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
        if (pattern.test(url)) {
            return platform;
        }
    }
    return null;
}

/**
 * Get platform info (name and emoji)
 * @param {string} platform - Platform key
 * @returns {object}
 */
function getPlatformInfo(platform) {
    return PLATFORM_INFO[platform] || { name: 'Unknown', emoji: '🎬' };
}

/**
 * Get video information using yt-dlp
 * @param {string} url - Video URL
 * @returns {Promise<object>}
 */
function getVideoInfo(url) {
    return new Promise((resolve, reject) => {
        const args = [
            '--dump-json',
            '--no-warnings',
            url
        ];

        const process = spawn('yt-dlp', args);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                try {
                    const info = JSON.parse(stdout);
                    resolve({
                        title: info.title || 'Video',
                        duration: info.duration || 0,
                        uploader: info.uploader || 'Unknown',
                        thumbnail: info.thumbnail || null
                    });
                } catch (e) {
                    reject(new Error('Failed to parse video info'));
                }
            } else {
                reject(new Error(stderr || 'Failed to get video info'));
            }
        });

        process.on('error', (err) => {
            reject(new Error(`yt-dlp not found. Please install it: ${err.message}`));
        });
    });
}

/**
 * Download video using yt-dlp
 * @param {string} url - Video URL
 * @param {string} quality - Quality (720 or 1080)
 * @param {string} downloadDir - Download directory
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>}
 */
function downloadVideo(url, quality, downloadDir, onProgress = null) {
    return new Promise((resolve, reject) => {
        ensureDir(downloadDir);

        const filename = generateFilename('mp4');
        const outputPath = path.join(downloadDir, filename);

        // Quality format selection
        // For quality, we try to get the best format up to the specified height
        // with both video and audio, or best available if not found
        const formatSpec = quality === '1080'
            ? 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
            : 'bestvideo[height<=720]+bestaudio/best[height<=720]/best';

        const args = [
            '-f', formatSpec,
            '--merge-output-format', 'mp4',
            '-o', outputPath,
            '--no-warnings',
            '--no-playlist',
            '--progress',
            // Bypass restrictions
            '--extractor-args', 'youtube:player_client=android',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            // Additional options for Facebook and other platforms
            '--no-check-certificates',
            '--prefer-insecure',
            '--retries', '3',
            '--fragment-retries', '3',
            url
        ];

        const process = spawn('yt-dlp', args);
        let stderr = '';
        let lastProgress = 0;

        process.stdout.on('data', (data) => {
            const output = data.toString();
            // Parse progress from yt-dlp output
            const match = output.match(/(\d+\.?\d*)%/);
            if (match && onProgress) {
                const progress = parseFloat(match[1]);
                // Only report progress every 10%
                if (progress - lastProgress >= 10) {
                    lastProgress = progress;
                    onProgress(Math.round(progress));
                }
            }
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0 && fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                resolve({
                    path: outputPath,
                    filename: filename,
                    size: stats.size
                });
            } else {
                reject(new Error(stderr || 'Download failed'));
            }
        });

        process.on('error', (err) => {
            reject(new Error(`yt-dlp not found. Please install yt-dlp: ${err.message}`));
        });
    });
}

/**
 * Get supported platforms list
 * @returns {string}
 */
function getSupportedPlatforms() {
    return Object.entries(PLATFORM_INFO)
        .map(([key, info]) => `${info.emoji} ${info.name}`)
        .join('\n');
}

module.exports = {
    detectPlatform,
    getPlatformInfo,
    getVideoInfo,
    downloadVideo,
    getSupportedPlatforms
};
