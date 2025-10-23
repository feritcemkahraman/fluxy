// PM2 Ecosystem Configuration for Fluxy Backend
module.exports = {
  apps: [{
    name: 'fluxy-backend',
    script: './server.js',
    instances: 2, // Use 2 instances for load balancing (adjust based on CPU cores)
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/pm2/fluxy-error.log',
    out_file: '/var/log/pm2/fluxy-out.log',
    merge_logs: true,
    
    // Auto restart on file changes (disable in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    
    // Restart policy
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    
    // Auto restart on crash
    autorestart: true,
    
    // Exponential backoff restart delay
    exp_backoff_restart_delay: 100,
    
    // Monitoring
    instance_var: 'INSTANCE_ID'
  }],
  
  deploy: {
    production: {
      user: 'root',
      host: '87.121.103.236',
      ref: 'origin/main',
      repo: 'https://github.com/feritcemkahraman/fluxy.git',
      path: '/var/www/fluxy-backend',
      'post-deploy': 'npm install --production && pm2 reload ecosystem.config.js --env production'
    }
  }
};
