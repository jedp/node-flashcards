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

    "given a .txt file": {
      topic: function(reader) {
               reader.read(__dirname + "/../data/mexican.1.txt", this.callback);
             },

      "can read it": function(err, vocab) {
        assert.isNull(err);
        assert.isArray(vocab);
        assert.equal(vocab[0][0], "about (prep)");
      }
    },

    "given a .json file": {
      topic: function(reader) {
               reader.read(__dirname + "/../data/mexican-verbs.1.json", this.callback);
             },

      "can read it": function(err, vocab) {
        assert.isNull(err);
        assert.isArray(vocab);
        assert.equal(vocab[0][0], "añadir: gerundio");
      }

    },

    "given an unsupported file type": {
      topic: function(reader) {
               // can't read .js files
               reader.read(__filename, this.callback);
             },

      "calls back with an error": function(err, vocab) {
        assert.notEqual(err, null);
        assert.isUndefined(vocab);
      }
              
    }
  }
})

.export(module);

