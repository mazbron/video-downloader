const fs = require('fs');
const path = require('path');

/**
 * Validate if string is a valid URL
 * @param {string} str - String to validate
 * @returns {boolean}
 */
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Format bytes to human readable size
 * @param {number} bytes - File size in bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Delete file if exists
 * @param {string} filePath - Path to file
 */
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Failed to cleanup file:', error.message);
  }
}

/**
 * Delete files older than specified age
 * @param {string} dirPath - Directory path
 * @param {number} maxAgeMs - Max age in milliseconds (default: 1 hour)
 */
function cleanupOldFiles(dirPath, maxAgeMs = 60 * 60 * 1000) {
  try {
    if (!fs.existsSync(dirPath)) return;

    const now = Date.now();
    const files = fs.readdirSync(dirPath);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      // Check if file is older than maxAge
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old file(s)`);
    }
  } catch (error) {
    console.error('Failed to cleanup old files:', error.message);
  }
}

/**
 * Start periodic cleanup (every 10 minutes)
 * @param {string} dirPath - Directory to clean
 */
function startCleanupScheduler(dirPath) {
  // Run cleanup every 10 minutes
  const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

  console.log('🕐 Auto cleanup enabled: files older than 1 hour will be deleted');

  setInterval(() => {
    cleanupOldFiles(dirPath);
  }, CLEANUP_INTERVAL);

  // Also run once at startup
  cleanupOldFiles(dirPath);
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generate unique filename
 * @param {string} ext - File extension
 * @returns {string}
 */
function generateFilename(ext = 'mp4') {
  return `video_${Date.now()}.${ext}`;
}

/**
 * Escape markdown special characters for Telegram
 * @param {string} text - Text to escape
 * @returns {string}
 */
function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

module.exports = {
  isValidUrl,
  formatSize,
  cleanupFile,
  cleanupOldFiles,
  startCleanupScheduler,
  ensureDir,
  generateFilename,
  escapeMarkdown
};
