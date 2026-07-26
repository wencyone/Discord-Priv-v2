const mongoose = require('mongoose');

const model = mongoose.model('wency-invite-joins', mongoose.Schema({
    guildId: String,
    userId: String,
    source: { type: String, default: 'unknown' },
    inviteCode: { type: String, default: '' },
    inviterId: { type: String, default: '' },
    inviterTotal: { type: Number, default: 0 },
}, { timestamps: true }));

module.exports = model;
