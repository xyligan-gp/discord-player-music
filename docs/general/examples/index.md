# A small example of writing a music bot using module

This is just the smallest part of what can be done. More examples can be found here: **[discord-player-music/examples](https://github.com/xyligan-gp/discord-player-music/tree/stable/examples)**

## Client and module initialization

```js
import { Collector, Loop, Player, Search } from 'discord-player-music';
import { Client, EmbedBuilder, GatewayIntentBits, Partials, TextChannel, VoiceChannel } from 'discord.js';

import { FilterType, PlayerLyricsData, PlayerQueue } from 'discord-player-music/types/PlayerData';

const client = new Client({
    rest: {
        offset: 0
    },

    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],

    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.Reaction,
        Partials.User
    ]
})

const defaultPrefix = '!';
const player = new Player(client);

client.on('ready', async () => {
    return console.log(`${client.user?.tag} is ready!`);
})

client.login('YOUR_CLIENT_TOKEN_HERE');
```

## Bot command initialization
```JS
client.on('messageCreate', async message => {
    const msgChannel = message.channel as TextChannel;
    const messageArray = message.content.split(' ');
    const command = messageArray[0];
})
```

## Writing bot commands

### Search command
```JS
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
        
    if(searchData?.error) {
        console.log(searchData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
    }else{
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

    if(searchData?.error) {
        console.log(searchData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
    }else{
        const lyricsData = searchData as PlayerLyricsData;

        if((lyricsData.result.length + lyricsData.query.length) <= 2048) message.channel.send({ content: `Search Query: **${lyricsData.query}**\n\n${lyricsData.result}` })
        else message.channel.send({ content: `${message.member}, result content exceeds 2048 characters!` });
    }
}
```

### Queue command

```js
if(command === `${defaultPrefix}queue`) {
    const guildQueue = await player.queue.get(msgChannel.guild.id);

    if(guildQueue?.error) {
        console.log(guildQueue.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
    }else{
        const queue = guildQueue as PlayerQueue;

        const embed = new EmbedBuilder()

        .setColor('Blue')
        .setTitle(`Guild Queue: ${queue.tracks.length}`)
        .setThumbnail(client.user?.avatarURL() as string)
        .setDescription(queue.tracks.map((track, index) => `\`[${index + 1}]\` **[${track.title}](${track.url})** \`[${track.duration.hours}:${track.duration.minutes}:${track.duration.seconds}]\``).join('\n'))

        message.channel.send({ embeds: [embed] });
    }
}
```

### Stop command

```js
if(command === `${defaultPrefix}stop`) {
    if(!message.member?.voice.channel) {
        message.channel.send({ content: `${message.member}, join to the voice channel!` });
        return;
    }

    const stopData = await player.queue.stop(msgChannel.guild.id);

    if(stopData?.error) {
        console.log(stopData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
    }else message.channel.send({ content: `${message.member}, server queue playing completed successfully!` });
}
```

### Skip command

```js
if(command === `${defaultPrefix}skip`) {
    if(!message.member?.voice.channel) {
        message.channel.send({ content: `${message.member}, join to the voice channel!` });
        return;
    }

    const skipData = await player.queue.skipTrack(msgChannel.guild.id);

    if(skipData?.error) {
        console.log(skipData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
    }else{
        if(skipData.next != null) message.channel.send({ content: `Skip track '${skipData.current.title}' and start playing '${skipData.next.title}'!` });
        else message.channel.send({ content: `Skip track '${skipData.current.title}'!` });
    }
}
```

### Seek command

```js
if(command === `${defaultPrefix}seek`) {
    const seekValue = Number(message.content.substring(defaultPrefix.length + 5));
        
    if(!message.member?.voice.channel) {
        message.channel.send({ content: `${message.member}, join to the voice channel!` });
        return;
    }

    if(seekValue && isNaN(seekValue)) {
        message.channel.send({ content: `` });
        return;
    }
        
    const seekData = await player.queue.seek(msgChannel.guild.id, seekValue || 0);

    if(seekData?.error) {
        console.log(seekData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
    }else message.channel.send({ content: `The current track has been successfully rewound by ${seekValue} seconds!` });
}
```

### Filter command

```js
if(command === `${defaultPrefix}filter`) {
    const filter = message.content.substring(defaultPrefix.length + 7) as FilterType;

    if(!message.member?.voice.channel) {
        message.channel.send({ content: `${message.member}, join to the voice channel!` });
        return;
    }

    if(filter && !await player.filters.isExists(filter)) {
        message.channel.send({ content: `${message.member}, you have specified an unknown filter!` });
    }else{
        const filterData = await player.queue.setFilter(msgChannel.guild.id, filter || 'clear');

        if(filterData?.error) {
            console.log(filterData.error);

            message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
        }else message.channel.send({ content: `Playback filter **${filterData.name}** installed successfully!` });
    }
}
```

### Join command

```js
if(command === `${defaultPrefix}join`) {
    const channelName = message.content.substring(defaultPrefix.length + 5);

    if(!channelName) {
        message.channel.send({ content: `${message.member}, enter the name of the voice channel!` });
        return;
    }

    const channel = message.guild?.channels.cache.find(c => c.name === channelName);

    if(channel && channel.isVoiceBased()) {
        const joinData = await player.voice.join(channel as VoiceChannel);

        if(joinData?.error) {
            console.log(joinData.error);

            message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
        }else message.channel.send({ content: `Member, the bot has successfully joined the ${channel} channel!` });
    }
}
```

### Leave command

```js
if(command === `${defaultPrefix}leave`) {
    const leaveData = await player.voice.leave(msgChannel.guild.id);

    if(leaveData?.error) {
        console.log(leaveData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
    }else message.channel.send({ content: `${message.member}, the bot has successfully left the ${message.guild?.channels.cache.get(leaveData.joinConfig.channelId as string)} voice channel!` });
}
```

### Nowplaying command

```js
if(command === `${defaultPrefix}nowplaying`) {
    const trackData = await player.queue.trackInfo(msgChannel.guild.id);

    if(trackData?.error) {
        console.log(trackData.error);

        message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
    }else{
        const progressData = await player.queue.progress(msgChannel.guild.id);

        message.channel.send({ content: `Track Title: **${trackData.title}**\nTrack URL: **${trackData.url}**\nTrack Duration: **[${trackData.duration.hours}:${trackData.duration.minutes}:${trackData.duration.seconds}]**\n\nProgress: [${progressData.percents}] ${progressData.bar}` });
    }
}
```

### Loop command

```js
if(command === `${defaultPrefix}loop`) {
    const type = message.content.substring(defaultPrefix.length + 5);

    if(type) {
        if(!type.includes('track') && !type.includes('queue')) {
            message.channel.send({ content: `${message.member}, you specified an incorrect loop type!` });
        }else{
            const loopData = await player.queue.setLoop(msgChannel.guild.id, type.includes('track') ? Loop.TRACK : Loop.QUEUE);

            if(loopData?.error) {
                console.log(loopData.error);

                message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
            }else message.channel.send({ content: `${message.member}, looping status changed successfully!` });
        }
    }else{
        const loopData = await player.queue.setLoop(msgChannel.guild.id, Loop.TRACK);

        if(loopData?.error) {
            console.log(loopData.error);

            message.channel.send({ content: `${message.member}, an error occurred while executing the command, take a look at the console!` });
        }else message.channel.send({ content: `${message.member}, looping status changed successfully!` });
    }
}
```

## Player Events Handling

### Ready event

```js
player.on('ready', async () => {
    return console.log(`\nPlayer by ${player.author} is ready!\nCurrent package version: ${player.version}\nPackage website URL: ${player.website}`);
})
```

### Error event

```js
player.on('error', async errorData => {
    return console.log(errorData);
})
```

### QueueStarted event

```js
player.on('queueStarted', async queue => {
    const channel = queue.channel.text;

    return channel.send({ content: `Queue for server with ID '${channel.guild.id}' started!` });
})
```

### PlayingTrack event

```js
player.on('playingTrack', async track => {
    const channel = track.channel.text;

    return channel.send({ content: `Playing '${track.title}' track...` });
})
```

### AddedTrack event

```js
player.on('addedTrack', async track => {
    const channel = track.channel.text;

    return channel.send({ content: `Track '${track.title}' added to queue...` });
})
```

### QueueEnded event

```js
player.on('queueEnded', async queue => {
    const channel = queue.channel.text;

    return channel.send({ content: `Queue for server with ID '${channel.guild.id}' ended!` });
})
```