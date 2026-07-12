const { EmbedBuilder } = require('discord.js');

function getUserGuildTag(user, guildId = null) {
    const primaryGuild = user?.primaryGuild || user?.primary_guild || user?.clan;
    if (!primaryGuild) return null;

    const identityGuildId = primaryGuild.identityGuildId
        || primaryGuild.identity_guild_id
        || primaryGuild.guildId
        || primaryGuild.guild_id
        || primaryGuild.id;
    const identityEnabled = primaryGuild.identityEnabled ?? primaryGuild.identity_enabled;

    if (guildId && (identityGuildId !== guildId || identityEnabled === false)) return null;

    return primaryGuild.tag || primaryGuild.badge || null;
}

async function syncGuildTagRole(member, settings, user, oldUser = null) {
    if (!member || !settings?.guildTagRole) return;

    const role = member.guild.roles.cache.get(settings.guildTagRole);
    if (!role || role.managed || role.position >= member.guild.members.me.roles.highest.position) return;

    const oldTag = oldUser ? getUserGuildTag(oldUser, member.guild.id) : null;
    const newTag = getUserGuildTag(user || member.user, member.guild.id);
    const hasRole = member.roles.cache.has(role.id);

    if (newTag && !hasRole) {
        await member.roles.add(role, `Guild tag alındı: ${newTag}`).catch(() => null);
    }

    if (!newTag && hasRole) {
        await member.roles.remove(role, 'Guild tag çıkarıldı.').catch(() => null);
    }

    if (oldUser && oldTag !== newTag) {
        await sendGuildTagLog(member, role, oldTag, newTag);
    }
}

async function sendGuildTagLog(member, role, oldTag, newTag) {
    const channel = member.guild.channels.cache.find((item) => item.name === 'guild-log');
    if (!channel?.isTextBased()) return;

    const isTaken = !oldTag && newTag;
    const isRemoved = oldTag && !newTag;
    const title = isTaken ? 'Guild Tag Alındı' : isRemoved ? 'Guild Tag Çıkarıldı' : 'Guild Tag Değişti';
    const color = isTaken ? 0x57f287 : isRemoved ? 0xed4245 : 0xfee75c;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setThumbnail(member.user.displayAvatarURL({ extension: 'png', size: 1024 }))
        .addFields(
            { name: 'Kullanıcı', value: `${member} (\`${member.id}\`)` },
            { name: 'Eski Tag', value: oldTag || 'Yok', inline: true },
            { name: 'Yeni Tag', value: newTag || 'Yok', inline: true },
            { name: 'Rol', value: `${role}`, inline: true }
        )
        .setTimestamp();

    await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [], roles: [] } }).catch(() => null);
}

module.exports = { getUserGuildTag, syncGuildTagRole };
