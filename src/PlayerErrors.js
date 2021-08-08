module.exports = {
    default: {
        oldNodeVersion: `Your Node.js version [{version}] is out of date! Please install Node.js version higher than 14.X`,
        oldLibraryVersion: `Your discord.js version [{version}] is out of date! Please install discord.js higher 12.X`,
        requiredClient: `<Client> not found for Discord Player Music!`,
        queueNotFound: `Server queue for '{guildID}' not found!`,
        permissionsNotFound: `Client '{clientTag}' missing permissions {permissions}!`,
        filterNotFound: `Filter '{filter}' not found in Discord Player Music filter collection!`,
        invalidValue: `The value '{value}' received an invalid data type/invalid value. Recommended type: '{type}'`,
        lyricsNotFound: `No lyrics found for '{query}'!`,
        songNotFound: `Song with index/name '{value}' not found!`,
        queuePaused: `The queue for '{guildID}' has already been temporarily paused!`,
        queueResumed: `The queue for '{guildID}' is already playing!`,
        queryNotFound: `Query not found for '{userID}'!`,
        resultsNotFound: `No results found for '{query}'!`,
    },

    collectorsManager: {
        largeValue: `Value '{value}' got too large. Maximum available value: '{maxValue}'`,
        smallValue: `Value '{value}' got a small value. Minimum available value: '{minValue}'`,

        useMessageCollector: `Collector of type '{type}' received more results than the limit in '{value}'. Use a collector of type '{collector}'.`
    },

    voiceManager: {
        userVoiceNotFound: `User '{userID}' not found in voice channel!`,
        connectionNotFound: `Connection on server '{guildID}' not found!`,

        clientInVoice: `Client '{clientTag}' is already in voice channel '{voiceName}'!`,
        clientNotInVoice: `Client '{clientTag}' not found in the voice channel '{voiceName}'!`
    }
}