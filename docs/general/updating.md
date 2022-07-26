This documentation page is a short list of changes to your code that will have to be done when switching to a specific version of discord-player-music.

# 1.1.5
In version 1.1.5, `discord-player-music` was completely rewritten for the manager system.

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
+ player.collectors.message
```

#### VoiceManager

```diff
- player.joinVoiceChannel
+ player.voice.join

- player.leaveVoiceChannel
+ player.voice.leave
```

#### UtilsManager

```diff
- player.createStream
+ player.utils.checkNode
+ player.utils.checkOptions
+ player.utils.checkPermissions
+ player.utils.createCollector
```

#### Main Player

```diff
- player.getSongIndex

- player.skipSong
+ player.skip

- player.stopPlaying
+ player.stop

- player.pausePlaying
+ player.pause

- player.resumePlaying
+ player.resume

- player.getCurrentSongInfo
+ player.getSongInfo

- player.initPlayer
+ player.init
```

# 1.1.7
In version 1.1.7, `discord-player-music` was completely rewritten on TypeScript language.

### Module Constructor

```diff
- options.collectorsConfig.autoAddingSongs
- options.collectorsConfig.maxAttempts
- options.collectorsConfig.time
+ options.autoAddingTracks

+ options.databaseConfig
+ options.databaseConfig.path
+ options.databaseConfig.checkInterval

+ options.progressConfig
+ options.progressConfig.size
+ options.progressConfig.line
+ options.progressConfig.slider

+ options.collectorsConfig.message
+ options.collectorsConfig.message.time
+ options.collectorsConfig.message.attempts

+ options.collectorsConfig.reaction
+ options.collectorsConfig.reaction.time
+ options.collectorsConfig.reaction.attempts
+ options.collectorsConfig.reaction.reactions
```

### Player Events Update

```diff
+ player#ready
+ player#queueStarted

- player#playerError
+ player#error

- player#songsAdded
+ player#addedTrack

- player#playingSong
+ player#playingTrack
```

### Player Methods Update

#### Main Player Class

```diff
- player.collectors.message
+ player.createCollector

- player.play
+ player.initGuildTrack

- player.searchSong
+ player.search

- player.addSong
+ player.initQueueTrack

- player.pause
+ player.queue.pause

- player.setLoopSong
- player.setLoopQeue
+ player.queue.setLoop

- player.skip
+ player.queue.skipTrack

- player.setFilter
+ player.queue.setFilter

- player.shuffle
+ player.queue.shuffle

- player.getGuildMap
- player.getQueue
+ player.queue.get

- player.getSongInfo
+ player.queue.trackInfo
+ player.queue.streamInfo

- player.getLyrics
+ player.lyrics

- player.getFilters
+ player.filters.list

- player.createProgressBar
+ player.queue.progress

- player.setVolume
+ player.queue.setVolume

- player.stop
+ player.queue.stop

- player.resume
+ player.queue.resume

- player.removeSong
+ player.queue.removeTrack
```

#### DatabaseManager

```diff
+ player.database.get
+ player.database.write
+ player.database.initGuild
+ private player.database.init
```

#### FiltersManager

```diff
+ player.filters.add
+ player.filters.isExists
+ player.filters.get
+ player.filters.list
+ player.filters.delete
+ private player.filters.init
```

#### PlaylistsManager

```diff
+ player.playlists.create
+ player.playlists.addTrack
+ player.playlists.play
+ player.playlists.removeTrack
+ player.playlists.delete
```

#### QueueManager

```diff
+ player.queue.add
+ player.queue.pause
+ player.queue.get
+ player.queue.progress
+ player.queue.streamInfo
+ player.queue.trackInfo
+ player.queue.setFilter
+ player.queue.setLoop
+ player.queue.setVolume
+ player.queue.skipTrack
+ player.queue.removeTrack
+ player.queue.seek
+ player.queue.shuffle
+ player.queue.resume
+ player.queue.stop
+ player.queue.delete
```

#### UtilsManager

```diff
- player.utils.checkNode
- player.utils.checkPermissions
- player.utils.getPlayerMode
+ player.utils.formatDuration
+ player.utils.createEmptyProgress
+ player.utils.getUniqueID
+ player.utils.getTrackDuration
```