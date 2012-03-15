module.exports = {
  redis_port: process.env['REDIS_PORT'] || 6385,
  redis_host: '127.0.0.1'
};

if (typeof module.exports.redis_port !== 'number') {
  module.exports.redis_port = parseInt(module.exports.redis_port, 10);
}
