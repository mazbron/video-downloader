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

        const proc = spawn('yt-dlp', args);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                try {
                    const info = JSON.parse(stdout);

                    // Find format sizes for 720p and 1080p
                    let size720 = null;
                    let size1080 = null;

                    if (info.formats) {
                        // Separate video and audio formats
                        const videoFormats = info.formats.filter(f => f.vcodec && f.vcodec !== 'none' && f.height);
                        const audioFormats = info.formats.filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'));

                        // Get best audio size
                        let audioSize = 0;
                        if (audioFormats.length > 0) {
                            const bestAudio = audioFormats.reduce((a, b) =>
                                ((a.filesize || a.filesize_approx || 0) > (b.filesize || b.filesize_approx || 0)) ? a : b);
                            audioSize = bestAudio.filesize || bestAudio.filesize_approx || 0;
                        }

                        // Find best video for each quality
                        const video720 = videoFormats.filter(f => f.height <= 720);
                        const video1080 = videoFormats.filter(f => f.height <= 1080);

                        if (video720.length > 0) {
                            const best = video720.reduce((a, b) =>
                                ((a.filesize || a.filesize_approx || 0) > (b.filesize || b.filesize_approx || 0)) ? a : b);
                            size720 = (best.filesize || best.filesize_approx || 0) + audioSize;
                        }

                        if (video1080.length > 0) {
                            const best = video1080.reduce((a, b) =>
                                ((a.filesize || a.filesize_approx || 0) > (b.filesize || b.filesize_approx || 0)) ? a : b);
                            size1080 = (best.filesize || best.filesize_approx || 0) + audioSize;
                        }
                    }

                    resolve({
                        title: info.title || 'Video',
                        duration: info.duration || 0,
                        uploader: info.uploader || 'Unknown',
                        thumbnail: info.thumbnail || null,
                        size720: size720,
                        size1080: size1080
                    });
                } catch (e) {
                    reject(new Error('Failed to parse video info'));
                }
            } else {
                reject(new Error(stderr || 'Failed to get video info'));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`yt-dlp not found. Please install it: ${err.message}`));
        });
    });
}

/**
 * Download video using yt-dlp
 * @param {string} url - Video URL
 * @param {string} quality - Quality (720 or 1080)
 * @param {string} downloadDir - Download directory
 * @param {string} platform - Platform name (youtube, tiktok, instagram, facebook, twitter)
 * @param {function} onProgress - Progress callback
 * @returns {Promise<object>}
 */
function downloadVideo(url, quality, downloadDir, platform = null, onProgress = null) {
    return new Promise((resolve, reject) => {
        ensureDir(downloadDir);

        const filename = generateFilename('mp4');
        const outputPath = path.join(downloadDir, filename);

        // Quality format selection
        // For 1080p: get best quality (let yt-dlp decide, prioritize bitrate)  
        // For 720p: limit to 720p max
        const formatSpec = quality === '1080'
            ? 'bv*[height<=1080]+ba/b[height<=1080]/b'
            : 'bv*[height<=720]+ba/b[height<=720]/b';

        const args = [
            '-f', formatSpec,
            '--merge-output-format', 'mp4',
            '-o', outputPath,
            '--no-warnings',
            '--no-playlist',
            '--progress',
            // Sort formats by quality (bitrate) - higher is better
            '-S', 'res,br,vcodec:h264',
            // Bypass restrictions
            '--extractor-args', 'youtube:player_client=android',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            // Additional options
            '--no-check-certificates',
            '--prefer-insecure',
            '--retries', '3',
            '--fragment-retries', '3',
        ];

        // Facebook needs re-encoding for Telegram compatibility
        // Other platforms: copy streams (no quality loss) but ensure proper container
        if (platform === 'facebook') {
            args.push('--recode-video', 'mp4');
            args.push('--postprocessor-args', 'ffmpeg:-c:v libx264 -preset slow -crf 18 -c:a aac -b:a 192k');
        } else {
            // Copy video/audio streams without re-encoding (preserves quality)
            args.push('--postprocessor-args', 'ffmpeg:-c:v copy -c:a copy');
        }

        // Add cookies if file exists (for Instagram, Twitter)
        const cookiesPath = path.join(process.cwd(), 'cookies.txt');
        if (fs.existsSync(cookiesPath)) {
            args.push('--cookies', cookiesPath);
        }

        args.push(url);

        const proc = spawn('yt-dlp', args);
        let stderr = '';
        let lastProgress = 0;

        proc.stdout.on('data', (data) => {
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

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            // Filter out Python deprecation warnings from stderr
            const filteredStderr = stderr
                .split('\n')
                .filter(line => !line.includes('Deprecated Feature') && !line.includes('Please update to Python'))
                .join('\n')
                .trim();

            if (code === 0 && fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                resolve({
                    path: outputPath,
                    filename: filename,
                    size: stats.size
                });
            } else if (fs.existsSync(outputPath)) {
                // Sometimes yt-dlp returns non-zero but file exists
                const stats = fs.statSync(outputPath);
                if (stats.size > 0) {
                    resolve({
                        path: outputPath,
                        filename: filename,
                        size: stats.size
                    });
                } else {
                    reject(new Error(filteredStderr || 'Download failed'));
                }
            } else {
                reject(new Error(filteredStderr || 'Download failed'));
            }
        });

        proc.on('error', (err) => {
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
