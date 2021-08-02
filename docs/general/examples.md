# Examples for creating a bot

This is just the smallest part of what can be done. More examples can be found here: **[discord-player-music/examples](https://github.com/xyligan-gp/discord-player-music/tree/main/example)**

## Client and module initialization
```JS
const Discord = require('discord.js');
const client = new Discord.Client();
const Player = require('discord-player-music');
const player = new Player(client);

client.on('ready', () => {
    console.log(`${client.user.tag} ready!`);
});

client.login('YOUR_BOT_TOKEN_HERE');
```

## Bot command initialization
```JS
client.on('message', message => {
    const messageArray = message.content.split(' ');
    const command = messageArray[0];
    const args = messageArray.slice(1);
});
```

## Writing bot commands

### Command `play`
```JS
if(command === '!play') {
    if(!message.member.voice.channel) return message.reply('join to the voice channel!');

    const query = args.join(' ');
    if(!query) return message.reply('enter your search request!');

    player.searchSong(message.member, query, message.channel).then(data => {
        if(!data[0].index) return;

        return message.channel.send(data.map(song => `**[${song.index}]** - **${song.title}** [${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]`));
    })
}
```

### Command `join`

```JS
if(command === '!join') {
    if(!message.member.voice.channel) return message.reply('join to the voice channel!');

    client.player.joinVoiceChannel(message.member).then(data => {
        return message.reply(`the bot joined the **${data.voiceChannel.name}** channel!`);
    }).catch(error => {
        if(error.message === 'The client is already in the VoiceChannel!') return message.reply('the bot is already in the voice channel!');
    })
}
```

### Command `leave`

```JS
if(command === '!leave') {
    if(!message.member.voice.channel) return message.reply('join to the voice channel!');

    client.player.leaveVoiceChannel(message.member).then(data => {
        return message.reply(`the bot left the voice channel **${data.voiceChannel.name}**`);
    }).catch(error => {
        if(error.message === 'The client is not already in the VoiceChannel!') return message.reply('bot not found in voice channel!');
    })
}
```

### Command `np`

```JS
if(command === '!np') {
    client.player.getCurrentSongInfo(message.guild).then(async data => {
        const progressBar = await client.player.createProgressBar(message.guild);

        return message.channel.send(`Song Title: **${data.songInfo.title}**\nSong URL: **${data.songInfo.url}**\nSong Duration: ${data.songInfo.duration.hours}:${data.songInfo.duration.minutes}:${data.songInfo.duration.seconds}\n\n${progressBar.bar} **[${progressBar.percents}]**`);
    }).catch(error => {
        if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
    })
}
```

### Command `skip`

```JS
if(command === '!skip') {
    if(!message.member.voice.channel) return message.reply('join to the voice channel!');

    client.player.skipSong(message.guild).then(data => {
        return message.reply(`song successfully skiped!`);
    }).catch(error => {
        if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
    })
}
```

### Command `stop`

```JS
if(command === '!stop') {
    if(!message.member.voice.channel) return message.reply('join to the voice channel!');

    client.player.stopPlaying(message.guild).then(status => {
        return message.reply('playing server queue stopped!');
    }).catch(error => {
        if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
    })
}
```

### Comamnd `lyrics`

```JS
if(command === '!lyrics') {
    client.player.getLyrics(message.guild).then(data => {
        return message.channel.send(`Song Title: **${data.song}**\n\n${data.lyrics}`);
    }).catch(async error => {
        if(error.message === 'Server queue not found!') return message.reply('server queue not found!');

        const guildMap = await client.player.getGuildMap(message.guild);
        if(error.message.includes('Lyrics')) return message.reply(`lyrics for song **${guildMap.songs[0].title}** not found!`);
    })
}
```

### Command `queue`

```JS
if(command === '!queue') {
    client.player.getQueue(message.guild).then(data => {
        return message.channel.send(data.map((song, index) => `\`[${index + 1}]\` - **${song.title}** [${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}]`));
    }).catch(error => {
        if(error.message === 'Server queue not found!') return message.reply('server queue not found!');
    })
}
```

## Module events and work with them

### Event `playingSong`

```JS
player.on('playingSong', data => {
    const song = data.songs[0];

    return data.textChannel.send(`Song Title: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**`);
});
```

### Event `songAdded`

```JS
player.on('songAdded', song => {
    return song.textChannel.send(`New Song Added To Queue!\n\nSong Title: **${song.title}**\nSong URL: **${song.url}**\nSong Duration: **${song.duration.hours}:${song.duration.minutes}:${song.duration.seconds}**`);
});
```

### Event `queueEnded`

```JS
player.on('queueEnded', data => {
    return data.textChannel.send('Server queue playing ended!');
});
```

### Event `playerError`

```JS
player.on('playerError', data => {
    if(!data.textChannel) return console.log(data.error);

    if(data.error.message.includes('Status code: 403')) return data.textChannel.send('A playback error has occurred! Trying to run...');
    if(data.error.message.includes('Status code: 404')) return data.textChannel.send('An error has occurred in the YouTube API! Try again.');
    if(data.error.message === 'The specifie value is not valid! Min value: 1, Max value: 10') return data.textChannel.send('Invalid value entered! Minimum: 1, Maximum: 10');
    if(data.error.message === 'The specifie value is not valid!') return data.textChannel.send('Invalid value entered!');
});
```