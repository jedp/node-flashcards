var fs = require('fs');

module.exports.read = function read(filename, callback) {
  callback = callback || function() {};

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
