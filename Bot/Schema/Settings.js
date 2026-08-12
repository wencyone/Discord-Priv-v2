const mongoose = require('mongoose');

const model = mongoose.model('wency-settings', mongoose.Schema({
    id: String,
    
    autoRole: { type: Boolean, default: false },
    genderSystem: { type: Boolean, default: false },
    buttonRegister: { type: Boolean, default: false },
    linkGuard: { type: Boolean, default: true },
    spamGuard: { type: Boolean, default: false },
    gifGuard: { type: Boolean, default: true },
    gifAuthRole: { type: [String], default: [] },
    clickCount: { type: Number, default: 0 },
    manClickCount: { type: Number, default: 0 },
    womanClickCount: { type: Number, default: 0 },

    privateRooms: { type: [Object], default: [] },
    privateRoomTopMoves: { type: [Object], default: [] },
    specialCmds: { type: [Object], default: [] },
    snipeData: { type: [Object], default: [] },
    teams: { type: [Object], default: [] },
    mentionChannelIds: { type: [String], default: [] },
    leaderboardPanel: { type: Object, default: {} },
    bannedGuildTags: { type: [Object], default: [] },
    
    botCommandChannel: { type: String, default: '' },
    commandLogChannel: { type: String, default: '' },
    inviteLogChannel: { type: String, default: '' },
    welcomeChannel: { type: String, default: '' },
    coinChannel: { type: String, default: '' },
    shipChannel: { type: String, default: '' },
    tweetChannel: { type: String, default: '' },
    secretRoomParent: { type: String, default: '' },
    secretRoomChannel: { type: String, default: '' },

    unregisteredRole: { type: String, default: '' },
    registeredRole: { type: String, default: '' },
    manRole: { type: String, default: '' },
    womanRole: { type: String, default: '' },
    familyRole: { type: [String], default: [] },
    vipRole: { type: String, default: '' },
    jailRole: { type: String, default: '' },
    guildTagRole: { type: String, default: '' },
    ownerRole: { type: [String], default: [] },

    banAuth: { type: [String], default: [] },
    auth: { type: [String], default: [] },

}))

module.exports = model;
