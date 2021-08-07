This documentation page is a short list of changes to your code that will have to be done when switching to a specific version of discord-player-music.

# 1.1.5
In version 1.1.5, `discord-player-music` was completely rewritten for the manager system. The full changelog can be seen here.

### Player Constructor

```diff
+ options.searchResultsLimit
+ options.synchronLoop
+ options.defaultVolume

+ options.collectorsConfig.autoAddingSongs
+ options.collectorsConfig.maxAttempts
+ options.collectorsConfig.time
```

### Player Methods Update
#### CollectorsManager

```diff
+ player.collectors.message(msg, resultsArray);
```

#### VoiceManager

```diff
- player.joinVoiceChannel(member);
+ player.voice.join(member);

- player.leaveVoiceChannel(member);
+ player.voice.leave(member);
```

#### UtilsManager

```diff
- player.createStream(guild);
+ player.utils.checkNode();
+ player.utils.checkOptions(options);
+ player.utils.checkPermissions(member, permissions);
+ player.utils.createCollector(message, type);
```

#### Main Player

```diff
- player.queue = new Map();
+ player.queue = new Collection();

- player.getSongIndex(tracksArray, member, channel);

- player.addSong(index, guild, tracksArray, textChannel, voiceChannel);
+ player.addSong(index, member, resultsArray);

- player.skipSong(guild);
+ player.skip(guild);

- player.stopPlaying(guild);
+ player.stop(guild);

- player.pausePlaying(guild);
+ player.pause(guild);

- player.resumePlaying(guild);
+ player.resume(guild);

- player.getCurrentSongInfo(guild);
+ player.getSongInfo(guild, index?);

- player.getLyrics(guild);
+ player.getLyrics(guild, query?);

- player.initPlayer();
+ player.init();
```