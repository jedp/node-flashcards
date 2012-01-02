var vows = require('vows');
var assert = require('assert');

try {
  var reader = require("../lib-instrumented/reader");
} catch(err) {
  var reader = require("../lib/reader");
}

vows.describe("reader.js test")

.addBatch({
  "The reader": {
    topic: reader,

    "can read .txt files": {
      topic: function(reader) {
               reader.read(__dirname + "/../data/mexican.1.txt", this.callback);
             },

      "like so": function(err, vocab) {
        assert.isNull(err);
        assert.isArray(vocab);
        assert.equal(vocab[0][0], "about (prep)");
      }
    },

    "can read .json files": {
      topic: function(reader) {
               reader.read(__dirname + "/../data/mexican-verbs.1.json", this.callback);
             },

      "like so": function(err, vocab) {
        assert.isNull(err);
        assert.isArray(vocab);
        assert.equal(vocab[0][0], "añadir: gerundio");
      }

    }
  }
})

.export(module);

