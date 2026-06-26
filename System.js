const { ActivityType } = require('discord.js');

module.exports = {
    
    serverID: '', 
    channelID: '', 
    serverName: '',
    ownerID: [], 
    database: '',


    Presence: {
        Status: 'online', 
        Type: ActivityType.Playing, 
        Message: [
            'Created By Wency', 
        ] 
    },

    Private: {
        Token: '', // private bot tokeni
        Prefix: ['.'],
    },

    Security: {
        Logger: '', // guard 1
        Punish: '', // guard 2
        Backup: '', // guard 3
        Prefix: ['.'],
        Dists: [
            ""
        
        ], 
        BotsIDs: [
            ""
        ], 
    },
};
