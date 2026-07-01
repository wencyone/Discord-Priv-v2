const mongoose = require('mongoose');

const punishmentSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    caseId: { type: Number, required: true, index: true },
    userId: { type: String, required: true, index: true },
    moderatorId: { type: String, required: true },
    type: { type: String, required: true, enum: ['ban', 'timeout', 'jail'] },
    reason: { type: String, default: 'Sebep belirtilmedi' },
    duration: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    previousRoles: { type: [String], default: [] },
    source: { type: String, default: 'command' },
    bannedGuildId: { type: String, default: '' },
    active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models['wency-punishment'] || mongoose.model('wency-punishment', punishmentSchema);
