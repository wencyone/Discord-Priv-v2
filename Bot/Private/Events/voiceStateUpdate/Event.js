const { Events } = require('discord.js');
const { Room, Stat, VoiceProtect } = require('./Functions');
const voiceLogModule = require('./Functions/VoiceLog');
const VoiceLog = typeof voiceLogModule === 'function' ? voiceLogModule : voiceLogModule?.default;

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const member = newState.member || oldState.member;
    const guild = newState.guild || oldState.guild;
    if (!member || member.user?.bot || !guild) return;
    if (global.system.serverID && guild.id !== global.system.serverID) return;

    // Voice log should never be blocked by Room/Stat errors.
    if (typeof VoiceLog === 'function') {
        try {
            await VoiceLog(client, oldState, newState);
        } catch (error) {
            console.error('[VOICE_LOG_EVENT]', error);
        }
    } else {
        console.error('[VOICE_LOG_EVENT] VoiceLog export is not a function.');
    }

    try {
        await VoiceProtect(client, oldState, newState);
    } catch (error) {
        console.error('[VOICE_PROTECT_EVENT]', error);
    }

    try {
        await Room(client, oldState, newState);
    } catch (error) {
        console.error('[VOICE_ROOM_EVENT]', error);
    }

    try {
        await Stat(client, oldState, newState);
    } catch (error) {
        console.error('[VOICE_STAT_EVENT]', error);
    }
})
