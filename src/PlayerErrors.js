module.exports = {
    default: {
        requiredClient: `<Client> not found for Discord Player Music!`,
        queueNotFound: `Server queue for '{guildID}' not found!`,
        permissionsNotFound: `Client '{clientTag}' missing permissions {permissions}!`,

        searchSong: {
            queryNotFound: `Query not found for '{userID}'!`
        }
    },

    voiceManager: {
        userVoiceNotFound: `User '{userID}' not found in voice channel!`,
        connectionNotFound: `Connection on server '{guildID}' not found!`,

        clientInVoice: `Client '{clientTag}' is already in voice channel '{voiceName}'!`,
        clientNotInVoice: `Client '{clientTag}' not found in the voice channel '{voiceName}'!`
    }
}