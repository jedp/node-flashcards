/*
 * A single-user flash card program
 */

var redis = require('redis');
var config = require('./config');
var fs = require('fs');

var redisClient = redis.createClient(config.redis_port, config.redis_host);

var user = process.env['USER'];
if (!user) throw (new Error("Can't get user from env"));

var decks = JSON.parse(fs.readFileSync("data/decks.json"));
var deckNumber = 0;

if (!module.parent) {
  var stdin = process.openStdin();
  require('tty').setRawMode(true);    

  /*
   * let the learning begin!
   */

  maybeInitializeDeck(user, deckNumber, function(err) {
    if (err) throw (err);

    showHelp();
    drawCard(user, deckNumber, function(err, word) { console.log(word) });
  });

  /*
   * commands
   *
   * the more this grows, the worse this gets ...
   * XXX switch to using readline interface?
   */

  stdin.on('keypress', function (chunk, key) {
    if (key && key.name) {
      switch(key.name) {
        case 'c':
          if (key.ctrl) exit();
          break;

        case 'd':
          console.log("\nAvailable decks:");
          decks.forEach(function(deck, index) {
            console.log('  ' + index + ' ' + deck.description);
          });
          console.log("Which deck?");
          break;

        case 'q':
          exit();
          break;

        case 'h':
          showHelp();
          // Show current word again
          redisClient.lindex('deck:'+user+':'+deckNumber, 0, function(err, word) {
            console.log(word);
          });
          break;

        case 's':
          shuffleDeck(user, deckNumber, function() {
            drawCard(user, deckNumber, function(err, word) {
              console.log(word);
            });
          });
          break;

        case 'y':
          if (key.shift) {
            console.log("   Ok, put that at the back of the deck.");
            putWayBack(user, deckNumber, function() {
              drawCard(user, deckNumber, function(err, word) {
                console.log(word);
              });
            });
          } else {
            guessedRight(user, deckNumber, function() {
              drawCard(user, deckNumber, function(err, word) {
                console.log(word);
              });
            });
          }
          break;

        case 'n':
          getDefinition(user, deckNumber, function(err, def) {
            guessedWrong(user, deckNumber, function() {
              console.log(" -> " + def);
              drawCard(user, deckNumber, function(err, word) {
                console.log(word);
              });
            });
          });
          break;

        default:
          break;
      }

    } else if(chunk) {    
      // maybe typed a number?
      var num = parseInt(chunk, 10);
      if (num >=0 && num <= decks.length-1) {
        deckNumber = num;
        maybeInitializeDeck(user, deckNumber, function(err) {
          if (err) throw (err);
          console.log("   Ok, switching to " + decks[deckNumber].description);
          drawCard(user, deckNumber, function(err, word) {
            console.log(word);
          });
        });
      }
    }

  });
}

/*
 * maybeInitializeDeck(callback)
 *
 * If Initialize the deck if it doesn't exist
 */

function maybeInitializeDeck(user, deckNumber, callback) {
  redisClient.llen('deck:'+user+':'+deckNumber, function(err, length) {
    if (err) return callback(err);

    if (length === 0) {
      return shuffleDeck(user, deckNumber, callback);
    } else {
      return callback(null);
    }
  });
}

/*
 * shuffleDeck(callback)
 *
 * XXX bad name for this function
 * Re-read the vocab file and shuffle the deck.  This is useful
 * for adding new words to the vocab without dumping the redis
 * db and so losing track of which words the student knows better.
 *
 */

function shuffleDeck(user, deckNumber, callback) {
  callback = callback || function() {};

  var filename = 'data/' + decks[deckNumber].filename;
  require('./database').getNewDeck(user, deckNumber, function() {
    redisClient.llen('deck:'+user+':'+deckNumber, function(err, length) {
      if (err) return callback (err);
      console.log("   OK, reshuffled the deck.");
      return callback (null);
    });
  });
}

/*
 * For debugging; show the first 30 cards in the deck
 */

function showFrontOfDeck(user, deckNumber) {
  redisClient.lrange('deck:'+user+':'+deckNumber, 0, 29, function(err, elems) {
    console.log("deck front: ");
    console.log(elems);
  });
}

/*
 * moveFirstCardBack(offset, callback)
 *
 * Pop the first card off the deck and move it back 'offset' places.
 */

function moveFirstCardBack(user, deckNumber, offset, callback) {
  // Move the front card back in the deck.
  redisClient.lpop('deck:'+user+':'+deckNumber, function(err, word) {
    redisClient.lindex('deck:'+user+':'+deckNumber, offset, function(err, pivot) {
      redisClient.linsert('deck:'+user+':'+deckNumber, 'AFTER', pivot, word, function(err, ok) {
        // console.log('  -- linsert deck AFTER ' + pivot + ' ' + word);
        return callback(err, ok);
      });
    });
  });
};

/*
 * putWayBack(callback)
 *
 * For cards you really know.  Put them at the end of the deck.
 */

function putWayBack(user, deckNumber, callback) {
  redisClient.llen('deck:'+user+':'+deckNumber, function(err, length) {
    moveFirstCardBack(user, deckNumber, length, callback);
  });
};

/* 
 * guessedRight(callback)
 *
 * The student got the word right.  Increment the count of 
 * correct guesses, and then move the card back in the deck.
 * The better the student knows the word, the farther back
 * the card goes.
 */

function guessedRight(user, deckNumber, callback) {
  redisClient.llen('deck:'+user+':'+deckNumber, function(err, length) {
    redisClient.lindex('deck:'+user+':'+deckNumber, 0, function(err, word) {
      redisClient.get('known:'+user+':'+deckNumber+':'+word, function(err, times) {
        times = parseInt(times || '0', 10);
        //console.log("guessed right " + times + " times already");
        times = times + 1;

        // add one to the number of correct guesses
        redisClient.set('known:'+user+':'+deckNumber+':'+word, times, function(err, ok) {
          //console.log("set known ->" + err + " " + ok);
          if (err) return callback(err);

          // And now push the card back farther into the deck.
          // The better we know the word, the farther back it goes.
          // Add a slight randomization, so series of correct guesses
          // can get mixed a bit.
          var offset = Math.min(
            Math.floor(times * (10 + (Math.floor(Math.random() * 3 + 7)))),
            length);
          //console.log(times + " times; offset " + offset);

          moveFirstCardBack(user, deckNumber, offset, callback);
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

function guessedWrong(user, deckNumber, callback) {
  redisClient.llen('deck:'+user+':'+deckNumber, function(err, length) {
    redisClient.lindex('deck:'+user+':'+deckNumber, 0, function(err, word) {
      redisClient.get('known:'+user+':'+deckNumber+':'+word, function(err, times) {
        times = parseInt(times || '0', 10);

        // subtract one from the number of correct guesses
        times = Math.max(0, times-1);

        redisClient.set('known:'+user+':'+deckNumber+':'+word, times, function(err, ok) {

          // now put the card between 5 and 20 places back in the deck
          offset = Math.min(Math.floor(Math.random() * 5) + 5, length);

          moveFirstCardBack(user, deckNumber, offset, callback);
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

function drawCard(user, deckNumber, callback) {
  //showFrontOfDeck();
  redisClient.lindex('deck:'+user+':'+deckNumber, 0, function(err, word) {
    if (err) return callback(err);
    return callback(null, word);
  });
}

/*
 * getDefinition()
 *
 * Get the definition of the first card in the deck
 */

function getDefinition(user, deckNumber, callback) {
  // get the definition
  drawCard(user, deckNumber, function(err, word) {
    redisClient.get('vocab:'+deckNumber+':'+word, function(err, def) {
      if (err) return callback(err);
      return callback(null, def);
    });
  });
};

/*
 * exit()
 *
 * Quit the program.  We don't need to save any state, because
 * the deck is only modified on a right or wrong guess.
 */

function exit() {
  console.log("Ok, bye!");
  process.exit();
};

/*
 * showHelp()
 *
 * Print enlightening information about how to use the CLI.
 */

function showHelp() {
  console.log(
      "\n",
      "My god, it's full of Spanish flash cards.\n",
      "I'll keep track of how well you know each word.\n",
      "Use the following keys to respond: \n\n",
      "(h) Show this help again\n",
      "(d) Change to another deck\n",
      "(y) Yes, I know it\n",
      "(Y) OMG that's so obvious!\n",
      "(n) No, I don't know it -- what is it?\n",
      "(s) Reshuffle deck\n",
      "(q) Quit\n"
      );
};



