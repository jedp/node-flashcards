var fs = require('fs');
var redis = require('redis');
var config = require('../config');

module.exports = function Flash(user) {
  if (typeof user !== 'string') {
    throw(new Error("required argument for Flash: user"));
  }

  this.user = user;
  this.decks = JSON.parse(fs.readFileSync(__dirname + "/../data/decks.json"));
  this.deckNumber = 0;
  this.redisClient = redis.createClient(config.redis_port, config.redis_host);

  var self = this;

  /*
   * functions to get redis keys
   */

  this.getDeckName = function() {
    return(['deck', self.user, self.deckNumber.toString()].join(':'));
  };

  this.getKnownWordKey = function(word) {
    return(['known', self.user, self.deckNumber.toString(), word].join(':'));
  };

  this.getDefinitionKey = function(word) {
    return(['vocab', self.deckNumber.toString(), word].join(':'));
  };

  /*
   * maybeInitializeDeck(callback)
   *
   * If Initialize the deck if it doesn't exist
   */

  this.maybeInitializeDeck = function(callback) {
    self.redisClient.llen(self.getDeckName(), function(err, length) {
      if (err) return callback(err);

      if (length === 0) {
        return self.shuffleDeck(callback);
      } else {
        return callback(null, length);
      }
    });
  };

  this.start = this.maybeInitializeDeck;

  /* 
   * chooseDeck(deckNumber, callback)
   *
   * change to a different flash card deck
   */

  this.chooseDeck = function(deckNumber, callback) {
    if (deckNumber >=0 && deckNumber <= self.decks.length-1) {
      self.deckNumber = deckNumber;
      self.maybeInitializeDeck(function(err) {
        if (err) return callback(err);
        return callback(null, true);
      });
    }
  };

  /*
   * shuffleDeck(callback)
   *
   * XXX bad name for this function
   * Re-read the vocab file and shuffle the deck.  This is useful
   * for adding new words to the vocab without dumping the redis
   * db and so losing track of which words the student knows better.
   *
   */

  this.shuffleDeck = function (callback) {
    callback = callback || function() {};

    var filename = __dirname + '/data/' + self.decks[self.deckNumber].filename;
    require('./database').getNewDeck(self.user, self.deckNumber, function() {
      self.redisClient.llen(self.getDeckName(), function(err, length) {
        if (err) return callback (err);
        console.log("   OK, reshuffled the deck.");
        return callback (null, length);
      });
    });
  }

  /*
   * putBack(offset, callback)
   *
   * Pop the first card off the deck and move it back 'offset' places.
   */

  this.putBack = function(offset, callback) {
    // Move the front card back in the deck.
    var deckName = self.getDeckName();
    self.redisClient.lpop(deckName, function(err, word) {
      self.redisClient.lindex(deckName, offset, function(err, pivot) {
        self.redisClient.linsert(deckName, 'AFTER', pivot, word, function(err, ok) {
          return callback(err, offset);
        });
      });
    });
  };

  /*
   * putWayBack(callback)
   *
   * For cards you really know.  Put them at the end of the deck.
   */

  this.putWayBack = function(callback) {
    self.putBack(-1, callback);
  };

  /* 
   * guessedRight(callback)
   *
   * The student got the word right.  Increment the count of 
   * correct guesses, and then move the card back in the deck.
   * The better the student knows the word, the farther back
   * the card goes.
   */

  this.guessedRight = function(callback) {
    var deckName = self.getDeckName();
  
    self.redisClient.llen(deckName, function(err, length) {
      self.redisClient.lindex(deckName, 0, function(err, word) {

        var knownKey = self.getKnownWordKey(word);
        self.redisClient.get(knownKey, function(err, times) {
          times = parseInt(times || '0', 10);
          times = times + 1;

          // add one to the number of correct guesses
          self.redisClient.set(knownKey, times, function(err, ok) {
            if (err) return callback(err);

            // And now push the card back farther into the deck.
            // The better we know the word, the farther back it goes.
            // Add a slight randomization, so series of correct guesses
            // can get mixed a bit.
            var offset = Math.min(
              Math.floor(times * (10 + (Math.floor(Math.random() * 3 + 7)))),
              length);

            return self.putBack(offset, callback);
          });
        });
      });
    });
  };

  /*
   * guessedWrong(callback)
   *
   * The student wasn't sure of the word.  Decrement the count
   * of correct gesses, if it's greater than 0, and move the card
   * 5 to 10 slots back in the deck.
   */

  this.guessedWrong = function(callback) {
    var deckName = self.getDeckName();
    self.redisClient.llen(deckName, function(err, length) {
      self.redisClient.lindex(deckName, 0, function(err, word) {

        var knownKey = self.getKnownWordKey(word);
        self.redisClient.get(knownKey, function(err, times) {
          times = parseInt(times || '0', 10);

          // subtract one from the number of correct guesses
          times = Math.max(0, times-1);

          self.redisClient.set(knownKey, times, function(err, ok) {

            // now put the card between 5 and 20 places back in the deck
            offset = Math.min(Math.floor(Math.random() * 5) + 5, length);

            return self.putBack(offset, callback);
          });
        });
      });
    });
  };


  /*
   * drawCard()
   *
   * Get the word on the first card in the deck.
   */

  this.drawCard = function(callback) {
    //showFrontOfDeck();
    self.redisClient.lindex(self.getDeckName(), 0, function(err, word) {
      if (err) return callback(err);
      return callback(null, word);
    });
  };

  /*
   * getDefinition()
   *
   * Get the definition of the first card in the deck
   */

  this.getDefinition = function(callback) {
    // get the definition
    self.drawCard(function(err, word) {
      self.redisClient.get(self.getDefinitionKey(word), function(err, def) {
        if (err) return callback(err);
        return callback(null, def);
      });
    });
  };

  this.end = function(callback) {
    self.redisClient.end();
  };

  return this;

};
