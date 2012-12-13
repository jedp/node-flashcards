var fs = require('fs');

var REDIS_CONF = "redis.conf";

try {
  // If we have a redis.conf file, read the port and host
  fs.statSync(REDIS_CONF);

  // convert redis keys to more verbose names
  var conversion = {'port': 'redis_port', 'bind': 'redis_host'};
  var match;

  fs.readFileSync(REDIS_CONF).toString().split('\n').forEach(function(line) {
    match = line.match(/^(port|bind)\s+(.*)$/);
    if (match) {
      module.exports[conversion[match[1]]] = match[2].trim();
    }
  });
  
} catch (redisConfDoesntExist) {
  // If there's no redis.conf, set host and port manually

  module.exports = {
    redis_port: process.env['REDIS_PORT'] || 6379,
    redis_host: '127.0.0.1'
  };
}

if (typeof module.exports.redis_port !== 'number') {
  module.exports.redis_port = parseInt(module.exports.redis_port, 10);
}
