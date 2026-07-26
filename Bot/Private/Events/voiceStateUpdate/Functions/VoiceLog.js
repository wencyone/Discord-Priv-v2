const {
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
} = require('discord.js');

const joinedAt = new Map();
const hydratedGuilds = new Set();

module.exports = async function VoiceLog(client, oldState, newState) {
    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    let logChannel = guild.channels.cache.find((channel) => channel.name?.trim().toLowerCase() === 'voice-log');
    if (!logChannel) {
        await guild.channels.fetch().catch(() => null);
        logChannel = guild.channels.cache.find((channel) => channel.name?.trim().toLowerCase() === 'voice-log');
    }
    if (!logChannel?.isTextBased()) return;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;
    const now = Date.now();
    hydrateVoiceSessions(guild, now);
    const sessionKey = getSessionKey(guild.id, member.id);
    const sessionStart = joinedAt.get(sessionKey) || now;

    if (!oldChannel && newChannel) {
        joinedAt.set(sessionKey, now);
        return sendVoiceLog(logChannel, member, 0x45c486, [
            `${member} **ses kanalına girdi** ${newChannel}`,
            `**❯ Kanalda bulunan üyeler:** ${formatChannelMembers(newChannel)}`,
        ], now);
    }

    if (oldChannel && !newChannel) {
        const duration = formatDuration(now - sessionStart);
        joinedAt.delete(sessionKey);
        return sendVoiceLog(logChannel, member, 0xed4245, [
            `${member} **ses kanalından ayrıldı** ${oldChannel}`,
            `**❯ Kanalda bulunan üyeler:** ${formatChannelMembers(oldChannel)}`,
            `**Seste Kalma Süresi:** ${duration}`,
        ], now);
    }

    if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
        const duration = formatDuration(now - sessionStart);
        joinedAt.set(sessionKey, now);
        return sendVoiceLog(logChannel, member, 0xfee75c, [
            `${member} **ses odasını değiştirdi**`,
            `**Eski Oda:** ${oldChannel}`,
            `**Yeni Oda:** ${newChannel}`,
            `**❯ Kanalda bulunan üyeler:** ${formatChannelMembers(newChannel)}`,
            `**Eski Odada Geçen Süre:** ${duration}`,
        ], now);
    }

    if (!newChannel) return;

    const changes = [];
    if (oldState.selfMute !== newState.selfMute) {
        changes.push(`🎤 Mikrofonunu **${newState.selfMute ? 'kapattı' : 'açtı'}**`);
    }
    if (oldState.selfDeaf !== newState.selfDeaf) {
        changes.push(`🎧 Hoparlörünü **${newState.selfDeaf ? 'kapattı' : 'açtı'}**`);
    }
    if (oldState.serverMute !== newState.serverMute) {
        changes.push(`🛡️ Mikrofonu yetkili tarafından **${newState.serverMute ? 'kapatıldı' : 'açıldı'}**`);
    }
    if (oldState.serverDeaf !== newState.serverDeaf) {
        changes.push(`🛡️ Hoparlörü yetkili tarafından **${newState.serverDeaf ? 'kapatıldı' : 'açıldı'}**`);
    }
    if (oldState.streaming !== newState.streaming) {
        changes.push(`🖥️ Yayını **${newState.streaming ? 'açtı' : 'kapattı'}**`);
    }
    if (oldState.selfVideo !== newState.selfVideo) {
        changes.push(`📷 Kamerasını **${newState.selfVideo ? 'açtı' : 'kapattı'}**`);
    }
    if (!changes.length) return;

    return sendVoiceLog(logChannel, member, 0x5865f2, [
        `${member} • ${newChannel}`,
        `**❯ Kanalda bulunan üyeler:** ${formatChannelMembers(newChannel)}`,
        ...changes,
    ], now);
};

async function sendVoiceLog(channel, member, color, lines, timestamp) {
    const container = new ContainerBuilder()
        .setAccentColor(color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent([
                        `# ${member.user.username}`,
                        ...lines,
                        '',
                        `**ID:** ${member.id} • <t:${Math.floor(timestamp / 1000)}:F>`,
                    ].join('\n'))
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ extension: 'png', size: 1024 }))
                )
        );

    return channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [] },
    }).catch(() => null);
}

function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}sa ${minutes}dk ${seconds}sn`;
}

function getSessionKey(guildId, memberId) {
    return `${guildId}:${memberId}`;
}

function hydrateVoiceSessions(guild, now) {
    if (hydratedGuilds.has(guild.id)) return;
    hydratedGuilds.add(guild.id);
    guild.channels.cache
        .filter((channel) => channel.isVoiceBased?.())
        .forEach((channel) => {
            channel.members.forEach((member) => {
                joinedAt.set(getSessionKey(guild.id, member.id), now);
            });
        });
}

function formatChannelMembers(channel) {
    const members = channel?.members?.filter((member) => !member.user.bot).map((member) => `${member}`);
    return members?.length ? members.join(', ') : 'Kimse yok.';
}
