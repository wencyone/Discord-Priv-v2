const { Model, Schema } = require('cherry3');

const model = new Model('wency-role', Schema({
    guild: String,
    role: String,
    isDeleted: Boolean,
    deletedTimestamp: Number,
    name: String,
    color: Number,
    position: Number,
    permissions: String,
    members: Array,
    pendingMembers: Array,
    restoreInProgress: Boolean,
    icon: String,
    unicodeEmoji: String,
    mentionable: Boolean,
    hoist: Boolean,
    channelOverwrites: Array
}), { $timestamps: true });

module.exports = model;
