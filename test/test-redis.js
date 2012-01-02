var vows = require('vows');
var assert = require('assert');
var redis = require('redis');
var config = require('../config');

vows.describe("Redis test").addBatch({
  "When you create a redis client": {
    topic: redis.createClient(config.redis_port, config.redis_host),
    "it can connect": function(topic) {
      assert.isObject(topic);
    }
  }
}).export(module);

