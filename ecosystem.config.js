module.exports = {
  apps: [{
    name: 'car-crash-lawyer',
    script: './index.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    time: true,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};