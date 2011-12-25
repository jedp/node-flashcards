var redis = require('redis');
var config = require('./config');

function getDeckFromFile(filename, callback) {
  var reader = require("./reader");
  reader.read(filename, function(err, deck) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, deck);
    }
  });
}

function shuffleDeckInPlace(deck) {
  // shuffle deck in place
  var length = deck.length;
  var lastIndex = length - 1;
  var a, b, temp;

  while (length--) {
    a = Math.floor(Math.random() * lastIndex);
    b = Math.floor(Math.random() * lastIndex);
    temp = deck[a];
    deck[a] = deck[b];
    deck[b] = temp;
  }
};

module.exports.getNewDeck = function getNewDeck(filename, callback) {
  getDeckFromFile(filename, function(err, deck) {
    if (err) return callback(err);

    shuffleDeckInPlace(deck);

    // push it into redis
    var client = redis.createClient(config.redis_port, config.redis_host);

    // clear the existing deck
    client.del('deck');

    var multi = client.multi();
    deck.forEach(function(pair) {
      if (pair[0] && pair[1]) {
        multi.set('vocab:'+pair[0], pair[1]);
        multi.lpush('deck', pair[0]);
      }
    });
    multi.exec(function(err, ret) {
      if (typeof callback === 'function') {
        return callback(err, ret);
      }
    });
    
  });
};


