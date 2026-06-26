const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    messageId: { type: String, default: '' },
    hostId: { type: String, required: true },
    prize: { type: String, required: true },
    winnerCount: { type: Number, default: 1 },
    endsAt: { type: Date, required: true, index: true },
    participants: { type: [String], default: [] },
    predeterminedWinnerId: { type: String, default: '' },
    predeterminedDisclosed: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'active', 'ending', 'ended'], default: 'pending', index: true },
    winners: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.models['private-giveaway'] || mongoose.model('private-giveaway', giveawaySchema);
