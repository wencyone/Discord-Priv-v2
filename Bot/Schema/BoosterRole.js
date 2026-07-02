const mongoose = require('mongoose');

const boosterRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    roleId: { type: String, required: true },
    sharedUserIds: { type: [String], default: [] },
    suspendedAt: { type: Date, default: null },
    deleteAt: { type: Date, default: null },
}, { timestamps: true });

boosterRoleSchema.index({ guildId: 1, ownerId: 1 }, { unique: true });

module.exports = mongoose.models['wency-booster-role'] || mongoose.model('wency-booster-role', boosterRoleSchema);
