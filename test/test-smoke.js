var vows = require('vows');
var assert = require('assert');

vows.describe("Smoke test").addBatch({
  "When you make a new flash object": {
    topic: new(require('../flash'))('_test'),

    "the redis keys are correct": function(topic) {
      assert.equal(topic.getDeckName(), 'deck:_test:0');
      assert.equal(topic.getKnownWordKey("foo"), 'known:_test:0:foo');
      assert.equal(topic.getDefinitionKey("foo"), 'vocab:0:foo');
    },

    "and the functions are available": function(topic) {
      assert.isFunction(topic.maybeInitializeDeck);
      assert.isFunction(topic.chooseDeck);
      assert.isFunction(topic.shuffleDeck);
      assert.isFunction(topic.putBack);
      assert.isFunction(topic.putWayBack);
      assert.isFunction(topic.guessedRight);
      assert.isFunction(topic.guessedWrong);
      assert.isFunction(topic.drawCard);
      assert.isFunction(topic.getDefinition);
      assert.isFunction(topic.end);
    }
  }
}).export(module);


