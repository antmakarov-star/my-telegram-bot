module.exports = {
  apps: [{
    name: 'corporate-translator-bot',
    script: 'bot.js',
    watch: false,
    restart_delay: 3000,
    max_restarts: 10,
    autorestart: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
