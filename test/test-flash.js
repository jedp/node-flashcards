var vows = require('vows');
var assert = require('assert');

// I don't know a better way to hand values from scope to scope.
var rightWord;
var easyWord;
var wrongWord;
var firstWord;
var formerWord;
var tempDef;
var tempNumber;

// A redis instance to check against what flash.js functions do
var config = require("../config");
var redis = require("redis").createClient(config.redis_port);

try {
  var Flash = require("../lib-instrumented/flash");
} catch (err) {
  require('util').debug("lib-instrumented not found, so no code coverage reporting");
  var Flash = require("../lib/flash");
}

vows.describe("flash.js test")

.addBatch({
  "Starting fresh: ": {
    topic: new Flash('_test'),

    "if the test db exists": {
      topic: function(flash) { 
               redis.del(flash.getDeckName(), this.callback); 
             }, 

      "tear it down": function(err, ok) {
        assert.isNull(err);
      }
    }

  }

})

.addBatch({
  "Flash throws an Error if initialized without a user name": function() {
    assert.throws(function() {new Flash()}, Error)
  }
})

.addBatch({
  "Setting up: ": {
    topic: new Flash('_test'),

    "initializing the test db": {
      topic: function(flash) { flash.maybeInitializeDeck(this.callback) },

      "like so": function(err, deckLength) {
        assert.isNull(err);
        assert.isNumber(deckLength);
        assert.notEqual(deckLength, 0);
      }
    }
  }
})

.addBatch({
  "The config file": {
    topic: require("../config"),
    "specifies redis port and host": function(topic) {
      assert.isNumber(topic.redis_port);
      assert.isString(topic.redis_host);
    }
  },

  "Flash": {
    topic: new Flash('_test'),

    "lets you draw the first card": {
      topic: function(flash) { flash.drawCard(this.callback); },

      "that has a word on it.": function(err, word) {
        assert.isNull(err);
        assert.isString(word);
      }
    },

    "lets you flip the first card over": {
      topic: function(flash) { 
               var self = this;
               flash.getDefinition(function(err, def) {
                 wordDef = def;
                 self.callback(err, def);
               });
             },

      "and get its definition.": function(err, def) {
        assert.isNull(err);
        assert.isString(def);
      }
    },

    "lets you guess right": {
      topic: function(flash) {
               var self = this;
               flash.drawCard(function(err, word) {
                 rightWord = word;
                  flash.guessedRight(function(err, offset) {
                    self.callback(err, offset);
                  });
               });
             },


      "and puts the card back in the deck": function(err, offset) {
        assert.isNull(err);
        assert.isNumber(offset);
        assert.notEqual(offset, 0);
        tempNumber = offset;
      },

      "after which the first card": {
        topic: function(err, offset) {
                 redis.lindex('deck:_test:0', 0, this.callback);
               },
        "is different": function(err, word) {
          assert.notEqual(word, rightWord);
        }

      }
    },

    "lets you guess wrong": {
      topic: function(flash) { 
               var self = this;
               flash.drawCard(function(err, word) {
                 wrongWord = word;
                  flash.guessedWrong(function(err, offset) {
                    self.callback(err, offset);
                  });
               });
             },

      "and puts the card back in the deck": function(err, offset) {
        assert.isNull(err);
        assert.isNumber(offset);
        assert.notEqual(offset, 0);
        tempNumber = offset;
      },

      "after which the first card": {
        topic: function(err, offset) {
                 redis.lindex('deck:_test:0', 0, this.callback);
               },
        "is different": function(err, word) {
          assert.notEqual(word, wrongWord);
        }

      }
    },

    "and when you really know it": {
      topic: function(flash) { 
               var self = this;
               flash.drawCard(function(err, word) {
                  easyWord = word;
                  flash.putWayBack(self.callback); 
               });
             },

      "it gets put at the end of the deck": function(err, offset) {
        assert.isNull(err);
        assert.isNumber(offset);
        assert.notEqual(offset, 0);
        tempNumber = offset;
      }, 

      "which you can see": {
        topic: function(err, offset) {
                 redis.lindex('deck:_test:0', offset, this.callback);
        },
        "with the returned offset value": function(err, word) {
          assert.equal(easyWord, word);
        }

      },

      "which you can see": {
        topic: function(err, offset) {
                 redis.lindex('deck:_test:0', -1, this.callback);
        },
        "with a redis lindex": function(err, word) {
          assert.equal(easyWord, word);
        }

      }
    },

    "lets you change decks": {
      topic: function(flash) {
               var self = this;
               flash.drawCard(function(err, word) {
                 formerWord = word;
                 flash.chooseDeck(1, function(err) {
                   flash.drawCard(function(err, word) {
                     self.callback(err, word);
                   });
                 });
               });
             },

      "like so": function (err, word) {
        assert.isNull(err);
        assert.isString(formerWord);
        assert.isString(word);
        assert.notEqual(word, formerWord);
      }

    } 

  }
})

.addBatch({
  "Cleaning up: ": {
    topic: new Flash('_test'),

    "tearing down the test db": {
      topic: function(flash) { 
               redis.del(flash.getDeckName(), this.callback); 
             }, 

      "like so": function(err, ok) {
        assert.isNull(err);
      }
    }

  }

})


.export(module);

