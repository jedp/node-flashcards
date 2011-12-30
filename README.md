Flash - Simple Vocabulary Flash Cards
=====================================

A single-user flash card program, hastily written in Mexico because
I forgot to bring a deck of blank flash cards, and my Spanish is 
horrible.

To use, start redis:

    redis-server redis.conf

And then run the CLI:

    node cli.js

It simulates the way you would normally use flash cards.  If you don't know a
word, you replace its card in the deck not far from the front.  If you do know
a word, you replace the card farther and farther from the deck each time you
guess it correctly.

There are multiple decks you can switch among.  To add more decks, create 
either a `.txt` or `.json` file on the model of the files in the `data/` 
dir, and then update the `decks.json` manifest in there.

When you quit, the state of each deck is preserved.



