const mongoose = require('mongoose');

const punishmentCounterSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    caseId: { type: Number, default: 0 }
});

module.exports = mongoose.models['wency-punishment-counter'] || mongoose.model('wency-punishment-counter', punishmentCounterSchema);
