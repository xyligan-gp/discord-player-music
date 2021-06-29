const MusicBot = require('../classes/Client.js');
const fetch = require('node-fetch');

module.exports = {
    name: 'ready',

    /**
     * @param {MusicBot} client Discord Client
     */
    run: async(client) => {
        setTimeout(version, 10);

        function version() {
            fetch('https://registry.npmjs.com/discord-player-music').then(res => res.json()).then(result => {
                client.user.setActivity({ name: `Version: ${result['dist-tags'].latest}`, type: 'STREAMING', url: 'https://twitch.tv/twitch' })
            })

            setTimeout(users, 10000);
        }

        function users() {
            client.user.setActivity({ name: `Users: ${client.users.cache.size}`, type: 'STREAMING', url: 'https://twitch.tv/twitch' });
            setTimeout(version, 10000);
        }

        return console.log(`${client.user.tag} ready!`);
    }
}