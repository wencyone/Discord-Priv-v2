const { bold } = require('discord.js');

module.exports = async function VoiceProtect(client, oldState, newState) {
    // Korunacak ses kanalı
    const CHANNEL_ID = "YT ROLUNDEKI KISILERIN DAHI GIREMICEGI KANAL ID ";

    // Girebilecek rol
    const ROLE_ID = "SADECE SECILEN KANALA GIREBILCEK ROL ID ";

    if (!global.voiceProtectSessions) global.voiceProtectSessions = new Set();

    const member = newState.member || oldState.member;
    if (!member || member.user?.bot) return;

    if (oldState.channelId === CHANNEL_ID && newState.channelId !== CHANNEL_ID) {
        global.voiceProtectSessions.delete(`${member.id}:${CHANNEL_ID}`);
        global.voiceProtectPendingMoves?.delete(`${member.id}:${CHANNEL_ID}`);
        return;
    }

    // Kullanıcı bu korumalı kanalda mı?
    if (newState.channelId !== CHANNEL_ID) return;

    // Rolü varsa işlem yapma
    if (member.roles.cache.has(ROLE_ID)) return;

    const sessionKey = `${member.id}:${newState.channelId}`;
    if (global.voiceProtectSessions.has(sessionKey)) return;

    const pendingExpires = global.voiceProtectPendingMoves?.get(sessionKey);
    if (pendingExpires && pendingExpires > Date.now()) {
        global.voiceProtectPendingMoves.delete(sessionKey);
        global.voiceProtectSessions.add(sessionKey);
        return;
    }
    if (pendingExpires) global.voiceProtectPendingMoves.delete(sessionKey);

    try {
        // DM gönder
        await member.send({
            content: `❌ ${bold(newState.channel.name)} adlı ses kanalına giriş yetkiniz bulunmamaktadır.`
        }).catch(() => {});

        // Sesten at
        await newState.disconnect('Yetkisiz ses kanalına giriş.');

    } catch (err) {
        console.error('[VOICE_PROTECT]', err);
    }
}
