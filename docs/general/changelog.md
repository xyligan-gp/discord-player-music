# Module Changelog
* ***Version 1.0.0***
  * Release module
* ***Version 1.0.1***
  * Code optimization
  * Fix methods `joinVoiceChannel()` and `leaveVoiceChannel()`
  * Added the `formatNumbers()` method for formatting numbers
  * Fix bugs
  * Fix `README.md`
* ***Version 1.0.2***
  * Code optimization
  * Fixed bug with repeating song/queue
  * Improving the quality of playing songs
  * Added filter system. Method `setFilter()`
  * Changing the returned data by some methods and events
  * Added the `getGuildMap()` method to get the server queue object
* ***Version 1.0.3***
  * Code optimization
  * Fix caught some bugs
  * Fixed minor bugs
  * Rewrite `README.md`
  * Fixed events
* ***Versions 1.0.4 - 1.0.5***
  * Update versions all dependencies
  * Fix `README.md`
* ***Version 1.0.6***
  * Fix module typings
  * Fix minor bugs
  * Added the `getFilters()` method to get arrays with player filters
  * Fix `README.md`
* ***Version 1.0.7***
  * Update versions all dependencies
* ***Version 1.0.8***
  * Fix method `searchVideo()`
  * Added the `getLyrics()` method to get lyrics for current song
* ***Version 1.1.0***
  * Fix filter system
  * Added the `shuffle()` method for shuffling songs in queue
* ***Version 1.1.1***
  * The `playerError` event has started to catch more errors about which users can be warned
  * When receiving an error `Status code: 403`, the module will restart the stream (previously, the stream simply ended)
  * Add the `removeSong()` method for removing songs from the queue
  * Completely rewritten `README.md`
  * Release of module documentation. Link: [dpm-docs](https://dpm-docs.tk)
* ***Version 1.1.2***
  * Updating the documentation for the new design style
  * The module structure has been completely rewritten
  * Added class `Utils`, some methods have been moved to it and marked as `public`
* ***Version 1.1.3***
  * Remove dependency on `<Discord.Message>` completely
  * The `searchVideo()` method has been replaced with `searchSong()`
  * Completely rewritten TypeScript code
  * The `getSongIndex()` and `addSong()` methods have been changed
  * The `playerError` event have been changed
* ***Version 1.1.5***
  * The module structure has been completely rewritten on managers
  * Completely rewritten `README.md`
  * Rewritten TypeScript code
  * Correction of bugs and errors
  * Adding support for `discord.js v13`
  * and many other changes...
* ***Version 1.1.6***
  * Fix Voice Manager
* ***Version 1.1.7***
  * The module has been completely rewritten to the new structure and the TypeScript language
  * Replaced old domain [dpm-docs](https://dpm-docs.tk) with new one [dpm-website](https://dpm.js.org)
  * Added new managers, simplified work with old ones
  * Optimization of module algorithms
  * Added server playlist functionality
  * Removed support for `discord.js v12` and added support for the current `discord.js v14`
  * Updated dependency versions to the latest ones
  * Updated old and added new events
  * Partial transition to enumerated types (enum)
  * The rest of the changes can be seen more clearly on the updates page...