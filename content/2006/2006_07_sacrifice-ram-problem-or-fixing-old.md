Title: Sacrifice RAM Problem
Date: 2006-07-13
Author: Seppe "Macuyiko" vanden Broucke
Subtitle:  Or: Fixing An Old Game

Update: check out new post with updated instructions [over here](|filename/2008_10_sacrifice-revisited.md).

Recently I found my old copy of Sacrifice ([Gamespot link](http://www.gamespot.com/pc/strategy/sacrifice/)). I really like this game because it reminds me of [Jullian Gollop](http://en.wikipedia.org/wiki/Julian_Gollop)'s Chaos. (Has anyone ever played this game on the Spectrum?) Basically, it's a bunch of wizards fighting it out.

The graphics are not as amazing anymore as they used to be. But who cares about that if you get a great gameplay experience (running at 120fps)? So I decided to install this game... on Windows XP... with more than 4Ghz processing power... and 4GB RAM... You could say this meets the minimum requirements.

Install went fine, I start the game and... I get an error thrown into my face. "Not enough Virtual Memory".

After reading on various message boards I found that the best solution was to "completely disable all virtual memory". So I did, and now the game worked. But I did not want to sacrifice (pun intended if you will) my virtual memory. And thus I did not play the game for another week or so.

I was just about to uninstall it when a friend of mine tried to install another old game on a fairly new machine: Championship Manager 01-02, which also gave an "hey you do not have enough RAM"-error.

So back to the message boards, where I found that people had been using an advanced compatibility tool from Microsoft. Which gave a lot more options than those you get when doing "Properties -> Compatibility". It's called `QFixApp`. And it lives in your Windows XP CD under `\Support\Tools\act20.exe`. After running it you had to follow the following steps:

1. Open `QFixApp`.
2. On Layers select `ProfilesSetup`.
3. On Fixes select `GlobalMemoryStatusLie` (check it).
4. Now from the browse button select `cm0102.exe`.
5. Click on Run.
6. Play the game.

> After you have checked the box click the advanced button and then click the create fix support button. It will then ask if you want to install the fix click yes compatibility permanently implemented into a fixes database so cm will run every time, the compatibility in the properties of an application are only basic the app wizard gives more detailed options.

This situation, of course, reminded me of my own Sacrifice-experience, so I tried to hunt down the program. ("Where's that damned XP CD!") Only to download it a few minutes later of eMule (just search for "QFixApp" or drop me an e-mail).

After setting up the options and checking `GlobalMemoryStatusLie` and `GlobalMemoryStatusTrim` too (!), Sacrifice worked and now runs like a dream.

There are a lot of other fixes too (who knew Microsoft had released such a helpful tool) so why not try it on some older programs which refuse to run on XP.

The "not enough RAM while I do have enough" is quite old. In fact, I remember trying to install Duke Nukem 3D Plutonium Pack on my new Pentium machine back in the day. (Which had, what: 133 Mhz and 32 MB RAM?) The installer threw a nice error out saying "You need at least XX or more memory!" while I had plenty... A pity that Internet wasn't that common in those days.

