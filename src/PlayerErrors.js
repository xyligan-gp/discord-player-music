module.exports = {
    clientNotRequired:      `You have not specified a bot client!`,
    clientInVoiceChannel:   `The client is already in the VoiceChannel!`,
    clientNotInVoiceChannel:`The client is not already in the VoiceChannel!`,
    permissionsNotFound:    `Your client missing permissions {perms} for connection to VoiceChannel!`,
    voiceChannelNotFound:   `VoiceChannel with the user not found!`,
    queueNotFound:          `Server queue not found!`,

    searchVideo: {
        userRequestNotFound:  `Search request not found!`
    },

    getSongIndex: {
        minMaxValue:        `The specifie value is not valid! Min value: 1, Max value: 10`,
        invalidTypeValue:   `The specifie value is not valid!`
    },

    setVolume: {
        minMaxValue:        `The specified value is not a valid! Min value: 0.1`,
        invalidTypeValue:   `The specified value is not a valid!`
    },
    
    setFilter: {
        filterNotFound:     `Filter name not received!`,
        invalidFilterType:  `Invalid filter type!`,
        invalidFilterName:  `Invalid filter name!`
    },

    getLyrics: {
        lyricsNotFound: `Lyrics not found for {song}!`
    },


    pausePlaying: {
        notResumed: `Song playback has already stopped!`
    },

    removeSong: {
        songNotFound: `Song with ID/title {value} not found!`
    },

    resumePlaying: {
        notPaused: `Song playback has not stopped!`
    }
}