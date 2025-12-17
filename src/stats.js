const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(process.cwd(), 'stats.json');

/**
 * Get default stats object
 */
function getDefaultStats() {
    return {
        users: [],
        totalDownloads: 0,
        downloads: {
            youtube: 0,
            tiktok: 0,
            instagram: 0,
            facebook: 0,
            twitter: 0,
            direct: 0
        },
        startDate: new Date().toISOString()
    };
}

/**
 * Load stats from file
 * @returns {object}
 */
function loadStats() {
    try {
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Failed to load stats:', error.message);
    }
    return getDefaultStats();
}

/**
 * Save stats to file
 * @param {object} stats
 */
function saveStats(stats) {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error('Failed to save stats:', error.message);
    }
}

/**
 * Track a user (add if not exists)
 * @param {number} userId
 */
function trackUser(userId) {
    const stats = loadStats();
    if (!stats.users.includes(userId)) {
        stats.users.push(userId);
        saveStats(stats);
    }
}

/**
 * Track a successful download
 * @param {string} platform
 */
function trackDownload(platform) {
    const stats = loadStats();
    stats.totalDownloads++;
    if (platform in stats.downloads) {
        stats.downloads[platform]++;
    }
    saveStats(stats);
}

/**
 * Get stats summary
 * @returns {object}
 */
function getStats() {
    const stats = loadStats();
    return {
        totalUsers: stats.users.length,
        totalDownloads: stats.totalDownloads,
        downloads: stats.downloads,
        startDate: stats.startDate
    };
}

/**
 * Format stats as message
 * @returns {string}
 */
function formatStatsMessage() {
    const stats = getStats();
    const startDate = new Date(stats.startDate).toLocaleDateString('id-ID');

    return `
📊 *Statistik Bot*

👥 Total Users: *${stats.totalUsers}*
📥 Total Downloads: *${stats.totalDownloads}*

*Downloads per Platform:*
🔴 YouTube: ${stats.downloads.youtube}
🎵 TikTok: ${stats.downloads.tiktok}
📸 Instagram: ${stats.downloads.instagram}
🔵 Facebook: ${stats.downloads.facebook}
🐦 Twitter: ${stats.downloads.twitter}
🔗 Direct: ${stats.downloads.direct || 0}

📅 Aktif sejak: ${startDate}
    `.trim();
}

module.exports = {
    trackUser,
    trackDownload,
    getStats,
    formatStatsMessage
};
