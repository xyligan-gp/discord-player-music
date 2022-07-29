# A small example of writing a music bot using module

This is just the smallest part of what can be done. More examples can be found here: **[discord-player-music/examples](https://github.com/xyligan-gp/discord-player-music/tree/stable/examples)**

## Client and module initialization

```js
import {
  Collector,
  GuildQueueState,
  Loop,
  Player,
  Search,
} from "discord-player-music";
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  TextChannel,
  VoiceChannel,
} from "discord.js";

import {
  Filter,
  LyricsData,
  PlayerQueue,
} from "discord-player-music/types/PlayerData";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],

  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.Reaction,
    Partials.User,
  ],
});

const defaultPrefix = "!";
const player = new Player(client);

client.on("ready", async () => {
  return console.log(`${client.user?.tag} is ready!`);
});

client.login("YOUR_CLIENT_TOKEN_HERE");
```

## Bot command initialization

```js
client.on('messageCreate', async message => {
    const msgChannel = message.channel as TextChannel;
    const messageArray = message.content.split(' ');
    const command = messageArray[0];
})
```

## Writing bot commands

### Search command

```js
if(command === `${defaultPrefix}search`) {
    const searchQuery = message.content.substring(defaultPrefix.length + 7);

    if(!message.member?.voice.channel) {
        message.channel.send({ content: `${message.member}, join to the voice channel!` });
        return;
    }

    if(!searchQuery) {
        message.channel.send({ content: `${message.member}, enter your search query!` });
        return;
    }

    const searchData = await player.search(searchQuery, message.member, msgChannel);

    if("error" in searchData) {
        console.log(searchData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });

        return;
    }

    if(searchData[0].searchType.includes(Search.TITLE)) {
        const embed = new EmbedBuilder()

        .setColor('Blue')
        .setTitle('Select track:')
        .setThumbnail(client.user?.avatarURL() as string)
        .setDescription(searchData.map((track, index) => `\`[${index + 1}]\` **[${track.title}](${track.url})** \`[${track.duration.hours}:${track.duration.minutes}:${track.duration.seconds}]\``).join('\n'))

        const msg = await message.channel.send({ embeds: [embed] });

        player.createCollector(Collector.REACTION, msg, searchData, message.author.id);
    }
}
```

### Lyrics command

```js
if(command === `${defaultPrefix}lyrics`) {
    const searchQuery = message.content.substring(defaultPrefix.length + 7);

    if(!searchQuery) {
        message.channel.send({ content: `${message.member}, enter your search query!` });
        return;
    }

    const searchData = await player.lyrics(searchQuery);

    if("error" in searchData) {
        console.log(searchData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });

        return;
    }

    const lyricsData = searchData as LyricsData;

    if((lyricsData.result.length + lyricsData.query.length) <= 2048) message.channel.send({ content: `Search Query: **${lyricsData.query}**\n\n${lyricsData.result}` })
    else message.channel.send({ content: `${message.member}, result content exceeds 2048 characters!` });
}
```

### Queue command

```js
if(command === `${defaultPrefix}queue`) {
    const guildQueue = await player.queue.get(msgChannel.guild.id);

    if("error" in guildQueue) {
        console.log(guildQueue.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
    }

    const queue = guildQueue as PlayerQueue;
    const embed = new EmbedBuilder()

    .setColor('Blue')
    .setTitle(`Guild Queue: ${queue.tracks.length}`)
    .setThumbnail(client.user?.avatarURL() as string)
    .setDescription(queue.tracks.map((track, index) => `\`[${index + 1}]\` **[${track.title}](${track.url})** \`[${track.duration.hours}:${track.duration.minutes}:${track.duration.seconds}]\``).join('\n'))

    message.channel.send({ embeds: [embed] });
    return;
}
```

### Stop command

```js
if (command === `${defaultPrefix}stop`) {
  if (!message.member?.voice.channel) {
    message.channel.send({
      content: `${message.member}, join to the voice channel!`,
    });
    return;
  }

  const stopData = await player.queue.stop(msgChannel.guild.id);
  if ("error" in stopData) {
    console.log(stopData.error);

    message.channel.send({
      content: `${message.member}, an error occurred while executing the command, take a look at the console!`,
    });
  }

  message.channel.send({
    content: `${message.member}, server queue playing completed successfully!`,
  });
}
```

### Skip command

```js
if (command === `${defaultPrefix}skip`) {
  if (!message.member?.voice.channel) {
    message.channel.send({
      content: `${message.member}, join to the voice channel!`,
    });

    return;
  }

  const skipData = await player.queue.skipTrack(msgChannel.guild.id);

  if ("error" in skipData) {
    console.log(skipData.error);

    message.channel.send({
      content: `${message.member}, an error occurred while executing the command, take a look at the console!`,
    });

    return;
  }

  if (skipData.next != null) {
    message.channel.send({
      content: `Skip track '${skipData.current.title}' and start playing '${skipData.next.title}'!`,
    });

    return;
  }

  message.channel.send({
    content: `Skip track '${skipData.current.title}'!`,
  });

  return;
}
```

### Seek command

```js
if (command === `${defaultPrefix}seek`) {
  const seekValue = Number(message.content.substring(defaultPrefix.length + 5));

  if (!message.member?.voice.channel) {
    message.channel.send({
      content: `${message.member}, join to the voice channel!`,
    });
    return;
  }

  if (seekValue && isNaN(seekValue)) {
    message.channel.send({ content: `` });
    return;
  }

  const seekData = await player.queue.seek(msgChannel.guild.id, seekValue || 0);
  if ("error" in seekData) {
    console.log(seekData.error);

    message.channel.send({
      content: `${message.member}, an error occurred while executing the command, take a look at the console!`,
    });

    return;
  }

  message.channel.send({
    content: `The current track has been successfully rewound by ${seekValue} seconds!`,
  });

  return;
}
```

### Filter command

```js
if(command === `${defaultPrefix}filter`) {
    const filter = message.content.substring(defaultPrefix.length + 7) as Filter;

    if(!message.member?.voice.channel) {
        message.channel.send({ content: `${message.member}, join to the voice channel!` });
        return;
    }

    const exists = await player.filters.isExists(filter)
    if(filter && !exists) {
        message.channel.send({ content: `${message.member}, you have specified an unknown filter!` });
        return;
    }

    const filterData = await player.queue.setFilter(msgChannel.guild.id, filter || 'clear');
    if("error" in filterData) {
        console.log(filterData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });

        return;
    }

    message.channel.send({ content: `Playback filter **${filterData.name}** installed successfully!` });
    return;
}
```

### Join command

```js
if (command === `${defaultPrefix}join`) {
  const channelName = message.content.substring(defaultPrefix.length + 5);

  if (!channelName) {
    message.channel.send({
      content: `${message.member}, enter the name of the voice channel!`,
    });
    return;
  }

  const channel = message.guild?.channels.cache.find(
    (c) => c.name === channelName
  );

  if (!channel.isVoiceBased()) {
    message.channel.send({
      content: `${message.member}, the channel you specified is not a voice channel!`,
    });

    return;
  }

  if (channel && channel.isVoiceBased()) {
    const joinData = await player.voice.join(channel);
    if ("error" in joinData) {
      console.log(joinData.error);

      message.channel.send({
        content: `${message.member}, an error occurred while executing the command, take a look at the console!`,
      });

      return;
    }

    message.channel.send({
      content: `Member, the bot has successfully joined the ${channel} channel!`,
    });

    return;
  }
}
```

### Leave command

```js
if(command === `${defaultPrefix}leave`) {
    const leaveData = await player.voice.leave(msgChannel.guild.id);

    if("error" in leaveData) {
        console.log(leaveData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });

        return;
    }

    const channel = message.guild?.channels.cache.get(leaveData.joinConfig.channelId as string);
    message.channel.send({ content: `${message.member}, the bot has successfully left channel ${channel}!` });
}
```

### Nowplaying command

```js
if (command === `${defaultPrefix}nowplaying`) {
  const trackData = await player.queue.trackInfo(msgChannel.guild.id);

  if ("error" in trackData) {
    console.log(trackData.error);

    message.channel.send({
      content: `${message.member}, an error occurred while executing the command, take a look at the console!`,
    });

    return;
  }

  const progressData = await player.queue.progress(msgChannel.guild.id);
  message.channel.send({
    content: `Track Title: **${trackData.title}**\nTrack URL: **${trackData.url}**\nTrack Duration: **[${trackData.duration.hours}:${trackData.duration.minutes}:${trackData.duration.seconds}]**\n\nProgress: [${progressData.percents}] ${progressData.bar}`,
  });

  return;
}
```

### Loop command

```js
if (command === `${defaultPrefix}loop`) {
  const type = message.content.substring(defaultPrefix.length + 5);

  if (type) {
    if (!type.includes("track") && !type.includes("queue")) {
      message.channel.send({
        content: `${message.member}, you specified an incorrect loop type!`,
      });
    } else {
      const loopData = await player.queue.setLoop(
        msgChannel.guild.id,
        type.includes("track") ? Loop.TRACK : Loop.QUEUE
      );

      if ("error" in loopData) {
        console.log(loopData.error);

        message.channel.send({
          content: `${message.member}, an error occurred while executing the command, take a look at the console!`,
        });

        return;
      }

      message.channel.send({
        content: `${message.member}, looping status changed successfully!`,
      });

      return;
    }
  } else {
    const loopData = await player.queue.setLoop(
      msgChannel.guild.id,
      Loop.TRACK
    );

    if ("error" in loopData) {
      console.log(loopData.error);

      message.channel.send({
        content: `${message.member}, an error occurred while executing the command, take a look at the console!`,
      });

      return;
    }

    message.channel.send({
      content: `${message.member}, looping status changed successfully!`,
    });

    return;
  }
}
```

### Pause command

```js
if(command === `${defaultPrefix}pause`) {
    const setStateData = await player.queue.setState(message.guild?.id as string, GuildQueueState.PAUSED);

    if("error" in setStateData) {
        console.log(setStateData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });

        return;
    }

    message.channel.send({ content: `${message.member}, queue playback successfully paused!` });
    return;
}
```

### Resume command

```js
if(command === `${defaultPrefix}resume`) {
    const setStateData = await player.queue.setState(message.guild?.id as string, GuildQueueState.PLAYING);

    if("error" in setStateData) {
        console.log(setStateData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });

        return;
    }

    message.channel.send({ content: `${message.member}, queue playback successfully resumed!` });
    return;
}
```

## Player Events Handling

### Ready event

```js
player.on("ready", async () => {
  return console.log(
    `\nPlayer by ${player.author} is ready!\nCurrent package version: ${player.version}\nPackage website URL: ${player.website}`
  );
});
```

### Error event

```js
player.on("error", async (errorData) => {
  return console.log(errorData);
});
```

### QueueStarted event

```js
player.on("queueStarted", async (queue) => {
  const channel = queue.channel.text;

  return channel.send({
    content: `Queue for server with ID '${channel.guild.id}' started!`,
  });
});
```

### CreatedPlaylist event

```js
player.on("createdPlaylist", async (playlist) => {
  return console.log(`Playlist with id ${playlist.id} success created!`);
});
```

### DeletedPlaylist event

```js
player.on("deletedPlaylist", async (playlist) => {
  return console.log(`Playlist with id ${playlist.id} successfully deleted!`);
});
```

### PlayingTrack event

```js
player.on("playingTrack", async (track) => {
  const channel = track.channel.text;

  return channel.send({ content: `Playing '${track.title}' track...` });
});
```

### AddedTrack event

```js
player.on("addedTrack", async (track) => {
  const channel = track.channel.text;

  return channel.send({ content: `Track '${track.title}' added to queue...` });
});
```

### QueueEnded event

```js
player.on("queueEnded", async (queue) => {
  const channel = queue.channel.text;

  return channel.send({
    content: `Queue for server with ID '${channel.guild.id}' ended!`,
  });
});
```

### QueueStateChange event

```js
player.on("queueStateChange", (queue, oldState, newState) => {
  const channel = queue.channel.text;

  channel.send({
    content: `Queue state changed with '${oldState}' on '${newState}'!`,
  });
});
```
