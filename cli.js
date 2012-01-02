/*
 * A single-user flash card program
 */

if (!module.parent) {
  var user = process.env['USER'];
  if (!user) throw (new Error("Can't get user from env"));

  var stdin = process.openStdin();
  require('tty').setRawMode(true);    

  var flash = new(require('./lib/flash'))(user);

  /*
   * let the learning begin!
   */

  flash.maybeInitializeDeck(function(err) {
    if (err) throw (err);

    showHelp();
    flash.drawCard(function(err, word) { console.log(word) });
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
          flash.decks.forEach(function(deck, index) {
            console.log('  ' + index + ' ' + deck.description);
          });
          console.log("Which deck?");
          break;

        case 'q':
          exit();
          break;

        case 'h':
          showHelp();
          flash.drawCard(function(err, word) {
            console.log(word);
          });
          break;

        case 's':
          flash.shuffleDeck(function() {
            flash.drawCard(function(err, word) {
              console.log(word);
            });
          });
          break;

        case 'y':
          if (key.shift) {
            console.log("   Ok, put that at the back of the deck.");
            flash.putWayBack(function() {
              flash.drawCard(function(err, word) {
                console.log(word);
              });
            });
          } else {
            flash.guessedRight(function() {
              flash.drawCard(function(err, word) {
                console.log(word);
              });
            });
          }
          break;

        case 'n':
          flash.getDefinition(function(err, def) {
            flash.guessedWrong(function() {
              console.log(" -> " + def);
              flash.drawCard(function(err, word) {
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
      flash.chooseDeck(num, function(err, ok) {
        if (!err && ok) {
          console.log("   Ok, switching to " + flash.decks[num].description);
          flash.drawCard(function(err, word) {
            console.log(word);
          });
        } else {
          if (err) throw (err);
        }
      });
    }

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
      "(d) Change to another deck\n",
      "(y) Yes, I know it\n",
      "(Y) OMG that's so obvious!\n",
      "(n) No, I don't know it -- what is it?\n",
      "(s) Reshuffle deck\n",
      "(q) Quit\n"
      );
};



