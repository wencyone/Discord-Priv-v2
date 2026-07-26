const mongoose = require('mongoose');

const forceBanSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, default: 'Sebep belirtilmedi' },
    active: { type: Boolean, default: true, index: true },
    unforceBy: { type: String, default: '' },
    unforceAt: { type: Date, default: null },
}, { timestamps: true });

forceBanSchema.index({ guildId: 1, userId: 1, active: 1 });

module.exports = mongoose.models['wency-force-ban'] || mongoose.model('wency-force-ban', forceBanSchema);
