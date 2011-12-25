/*
 * A single-user flash card program
 */

var redis = require('redis');
var config = require('./config');

var redisClient = redis.createClient(config.redis_port, config.redis_host);
var deckSize = 0;
var currentWord = '';
var currentDef = '';

if (!module.parent) {
  var stdin = process.openStdin();
  require('tty').setRawMode(true);    

  /*
   * let the learning begin!
   */

  maybeInitializeDeck(function(err) {
    if (err) throw (err);

    showHelp();
    drawCard();
  });

  /*
   * commands
   */

  stdin.on('keypress', function (chunk, key) {
    if (key) {
      switch(key.name) {
        case 'c':
          if (key.ctrl) exit();
          break;

        case 'q':
          exit();
          break;

        case 'h':
          showHelp();
          console.log(currentWord);
          break;

        case 's':
          shuffleDeck(drawCard);
          break;

        case 'y':
          guessedRight(drawCard);
          break;

        case 'n':
          console.log(" -> " + currentDef);
          guessedWrong(drawCard);
          break;

        default:
          break;
      }
    }    
  });
}

/*
 * maybeInitializeDeck(callback)
 *
 * If Initialize the deck if it doesn't exist
 */

function maybeInitializeDeck(callback) {
  redisClient.llen('deck', function(err, length) {
    if (err) return callback(err);

    if (length === 0) {
      return shuffleDeck(callback);
    } else {
      deckSize = length;
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

function shuffleDeck(callback) {
  callback = callback || function() {};

  console.log("Shuffling the deck ...");
  require('./database').getNewDeck('data/mexican.1.txt', function() {
    redisClient.llen('deck', function(err, length) {
      if (err) return callback (err);
      deckSize = length;
      return callback (null);
    });
  });
}

/*
 * For debugging; show the first 30 cards in the deck
 */

function showFrontOfDeck() {
  redisClient.lrange('deck', 0, 29, function(err, elems) {
    console.log("deck front: ");
    console.log(elems);
  });
}

/*
 * moveFirstCardBack(offset, callback)
 *
 * Pop the first card off the deck and move it back 'offset' places.
 */

function moveFirstCardBack(offset, callback) {
  // Move the front card back in the deck.
  redisClient.lpop('deck', function(err, word) {
    redisClient.lindex('deck', offset, function(err, pivot) {
      redisClient.linsert('deck', 'AFTER', pivot, word, function(err, ok) {
        // console.log('  -- linsert deck AFTER ' + pivot + ' ' + word);
        return callback(err, ok);
      });
    });
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

function guessedRight(callback) {
  var word = currentWord;
  redisClient.get('known:'+word, function(err, times) {
    times = parseInt(times || '0', 10);
    //console.log("guessed right " + times + " times already");
    times = times + 1;

    // add one to the number of correct guesses
    redisClient.set('known:'+word, times, function(err, ok) {
      //console.log("set known ->" + err + " " + ok);
      if (err) return callback(err);

      // And now push the card back farther into the deck.
      // The better we know the word, the farther back it goes.
      // Add a slight randomization, so series of correct guesses
      // can get mixed a bit.
      var offset = Math.min(
        Math.floor(times * Math.floor(Math.random() * 3 + 7)) + 10, 
        deckSize);
      //console.log(times + " times; offset " + offset);

      moveFirstCardBack(offset, callback);
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

function guessedWrong(callback) {
  var word = currentWord;
  redisClient.get('known:'+word, function(err, times) {
    times = parseInt(times || '0', 10);

    // subtract one from the number of correct guesses
    times = Math.max(0, times-1);

    redisClient.set('known:'+word, times, function(err, ok) {

      // now put the card between 5 and 20 places back in the deck
      offset = Math.floor(Math.random() * 5) + 5;

      moveFirstCardBack(offset, callback);
    });
  });
};

/*
 * drawCard()
 *
 * Show the card at the front of the deck.  Set the global
 * variables currentWord and currentDef to the card's word
 * and definition respectively.  
 */

function drawCard() {
  //showFrontOfDeck();
  redisClient.lindex('deck', 0, function(err, word) {
    if (err) throw(err);

    currentWord = word;

    // show the word
    console.log(currentWord);

    // get the definition
    redisClient.get('vocab:'+word, function(err, def) {
      if (err) throw(err);
      currentDef = def;
    });
  });
}

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
      "(y) Yes, I know it\n",
      "(n) No, I don't know it -- what is it?\n",
      "(s) Reshuffle deck\n",
      "(q) Quit\n"
      );
};



