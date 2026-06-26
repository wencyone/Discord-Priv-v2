const { EmbedBuilder, codeBlock } = require('discord.js');

const joinedAt = new Map();

module.exports = async function VoiceLog(client, oldState, newState) {
    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    let logChannel = guild.channels.cache.find((c) => c.name?.trim().toLowerCase() === 'voice-log');
    if (!logChannel) {
        await guild.channels.fetch().catch(() => null);
        logChannel = guild.channels.cache.find((c) => c.name?.trim().toLowerCase() === 'voice-log');
    }
    if (!logChannel || !logChannel.isTextBased()) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    const now = Date.now();
    const sessionStart = joinedAt.get(member.id);

    if (!oldChannel && newChannel) {
        joinedAt.set(member.id, now);
        await logChannel.send({
            embeds: [new EmbedBuilder({
                title: 'Sese Giris',
                color: 0x57F287,
                description: codeBlock('yaml', [
                    '# Voice Log',
                    `-> Kullanici: ${member.user.username} (${member.id})`,
                    `-> Olay: Sese giris`,
                    `-> Kanal: ${newChannel.name} (${newChannel.id})`,
                    `-> Zaman: ${date(now)}`
                ].join('\n'))
            })]
        }).catch(() => null);
        return;
    }

    if (oldChannel && !newChannel) {
        const duration = sessionStart ? formatDuration(now - sessionStart) : 'Bilinmiyor';
        joinedAt.delete(member.id);
        await logChannel.send({
            embeds: [new EmbedBuilder({
                title: 'Sesten Cikis',
                color: 0xED4245,
                description: codeBlock('yaml', [
                    '# Voice Log',
                    `-> Kullanici: ${member.user.username} (${member.id})`,
                    `-> Olay: Sesten cikis`,
                    `-> Kanal: ${oldChannel.name} (${oldChannel.id})`,
                    `-> Seste kalma suresi: ${duration}`,
                    `-> Zaman: ${date(now)}`
                ].join('\n'))
            })]
        }).catch(() => null);
        return;
    }

    if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
        const duration = sessionStart ? formatDuration(now - sessionStart) : 'Bilinmiyor';
        joinedAt.set(member.id, now);
        await logChannel.send({
            embeds: [new EmbedBuilder({
                title: 'Oda Degistirme',
                color: 0xFEE75C,
                description: codeBlock('yaml', [
                    '# Voice Log',
                    `-> Kullanici: ${member.user.username} (${member.id})`,
                    `-> Olay: Oda degistirme`,
                    `-> Eski kanal: ${oldChannel.name} (${oldChannel.id})`,
                    `-> Yeni kanal: ${newChannel.name} (${newChannel.id})`,
                    `-> Eski odada gecen sure: ${duration}`,
                    `-> Zaman: ${date(now)}`
                ].join('\n'))
            })]
        }).catch(() => null);
        return;
    }

    const changes = [];
    if (oldState.selfMute !== newState.selfMute) changes.push(`Self Mute: ${stateText(oldState.selfMute)} -> ${stateText(newState.selfMute)}`);
    if (oldState.selfDeaf !== newState.selfDeaf) changes.push(`Self Deaf: ${stateText(oldState.selfDeaf)} -> ${stateText(newState.selfDeaf)}`);
    if (oldState.serverMute !== newState.serverMute) changes.push(`Server Mute: ${stateText(oldState.serverMute)} -> ${stateText(newState.serverMute)}`);
    if (oldState.serverDeaf !== newState.serverDeaf) changes.push(`Server Deaf: ${stateText(oldState.serverDeaf)} -> ${stateText(newState.serverDeaf)}`);
    if (oldState.streaming !== newState.streaming) changes.push(`Yayin: ${stateText(oldState.streaming)} -> ${stateText(newState.streaming)}`);
    if (oldState.selfVideo !== newState.selfVideo) changes.push(`Kamera: ${stateText(oldState.selfVideo)} -> ${stateText(newState.selfVideo)}`);

    if (!changes.length || !newChannel) return;

    await logChannel.send({
        embeds: [new EmbedBuilder({
            title: 'Ses Durumu Guncellendi',
            color: 0x5865F2,
            description: [
                codeBlock('yaml', [
                    '# Voice Log',
                    `-> Kullanici: ${member.user.username} (${member.id})`,
                    `-> Kanal: ${newChannel.name} (${newChannel.id})`,
                    `-> Zaman: ${date(now)}`
                ].join('\n')),
                codeBlock('fix', changes.join('\n'))
            ].join('\n')
        })]
    }).catch(() => null);
};

function stateText(state) {
    return state ? 'Acik' : 'Kapali';
}

function date(value) {
    return new Date(value).toLocaleString('tr-TR', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}s ${minutes}dk ${seconds}sn`;
}
