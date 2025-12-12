module.exports = {
    apps: [{
        name: 'video-downloader-bot',
        script: 'src/index.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '500M',
        env: {
            NODE_ENV: 'production'
        },
        // Logging
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: 'logs/error.log',
        out_file: 'logs/out.log',
        merge_logs: true,
        // Restart policy
        exp_backoff_restart_delay: 100,
        max_restarts: 10,
        restart_delay: 3000
    }]
};
