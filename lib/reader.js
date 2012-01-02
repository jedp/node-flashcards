var fs = require('fs');

/*
 * Read a vocab file.
 * Can be .txt or .json.
 */

module.exports.read = function read(filename, callback) {
  callback = callback || function() {};

  if (filename.match(/\.txt$/)) {
    return txt_reader(filename, callback);
  } else if (filename.match(/\.json$/)) {
    return json_reader(filename, callback);
  } else {
    return callback (new Error("Don't know how to read " + filename));
  }
}

/*
 * Get vocab from a text file.
 *
 * Structure must be pairs of lines separated by at least two newlines.
 * First line is word to translate, second line is translation.
 */

function txt_reader(filename, callback) {
  fs.readFile(filename, function(err, buf) {
    if (err) return callback(err);

    var vocab = [];
    buf
      .toString()
      .split(/\n\n+/)
      .forEach(function(tuple) {
        tuple = tuple.trim();
        if (tuple !== "") {
          var words = tuple.split(/\n/);
          // remove alphabetization marker
          if (words[0] && words[1]) {
            var from = words[0].replace('|', '');
            var to = words[1];
            vocab.push( [from, to] );
          }
        }
    });    

    return callback(null, vocab);
  });
}

/*
 * get vocab from a json file
 *
 * structure must be:
 * {word1:
 *   {form1: "a string", 
 *    form2: ['or', 'some', 'inflections'],
 *    ...},
 *  word2: { ... }, 
 *  ...
 *  }
 */
function json_reader(filename, callback) {
  fs.readFile(filename, function(err, buf) {
    if (err) return callback(err);

    var vocab = [];
    var data = JSON.parse(buf.toString());
    for (var word in data) {
      if (data.hasOwnProperty(word)) {
        for (var form in data[word]) {
          if (data[word].hasOwnProperty(form)) {
            var to = data[word][form];
            if (typeof(to) === 'string') {
              vocab.push( [word + ': ' + form, to] );
            } else {
              vocab.push( [word + ': ' + form, to.join(', ')] );
            }
          }
        }
      }
    }

    return callback(null, vocab);
  });
}

