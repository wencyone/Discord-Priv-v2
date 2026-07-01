const { EmbedBuilder } = require('discord.js');
const Punishment = require('../Schema/Punishment');
const PunishmentCounter = require('../Schema/PunishmentCounter');

function getPrimaryGuildData(user) {
    const primaryGuild = user?.primaryGuild || user?.primary_guild;
    if (!primaryGuild) return null;

    return {
        guildId: primaryGuild.identityGuildId || primaryGuild.identity_guild_id || primaryGuild.guildId || primaryGuild.guild_id || primaryGuild.id,
        tag: primaryGuild.tag,
        identityEnabled: primaryGuild.identityEnabled ?? primaryGuild.identity_enabled,
    };
}

function findBannedGuildTag(user, settings) {
    const primaryGuild = getPrimaryGuildData(user);
    if (!primaryGuild?.guildId || primaryGuild.identityEnabled === false) return null;
    const tags = Array.isArray(settings?.bannedGuildTags) ? settings.bannedGuildTags : [];
    return tags.find((entry) => entry.guildId === primaryGuild.guildId) || null;
}

async function syncBannedGuildTag(client, member, settings, user = member.user) {
    if (!settings?.autoRole) return 'disabled';

    const bannedTag = findBannedGuildTag(user, settings);
    const punishment = await Punishment.findOne({
        guildId: member.guild.id,
        userId: member.id,
        type: 'jail',
        source: 'bannedGuildTag',
        active: true,
    }).sort({ caseId: -1 });

    if (bannedTag) {
        if (punishment) {
            const jailRole = member.guild.roles.cache.get(settings.jailRole);
            if (jailRole && !member.roles.cache.has(jailRole.id)) {
                await member.roles.set([jailRole.id], 'Yasaklı guild tag cezası devam ediyor.').catch(() => null);
            }
            return 'jailed';
        }

        return applyBannedGuildTagJail(client, member, settings, bannedTag);
    }

    if (punishment) {
        const released = await releaseBannedGuildTagJail(client, member, settings, punishment);
        return released ? 'released' : 'jailed';
    }

    return 'clear';
}

async function applyBannedGuildTagJail(client, member, settings, bannedTag) {
    const jailRole = member.guild.roles.cache.get(settings.jailRole);
    if (!jailRole || jailRole.position >= member.guild.members.me.roles.highest.position) return 'blocked';

    const previousRoles = member.roles.cache
        .filter((role) => role.id !== member.guild.id && !role.managed && role.id !== jailRole.id)
        .map((role) => role.id);
    const counter = await PunishmentCounter.findOneAndUpdate(
        { guildId: member.guild.id },
        { $inc: { caseId: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const punishment = await Punishment.create({
        guildId: member.guild.id,
        caseId: counter.caseId,
        userId: member.id,
        moderatorId: client.user.id,
        type: 'jail',
        source: 'bannedGuildTag',
        bannedGuildId: bannedTag.guildId,
        reason: `Yasaklı guild tag: ${bannedTag.name || bannedTag.guildId}${bannedTag.tag ? ` [${bannedTag.tag}]` : ''}`,
        duration: 0,
        expiresAt: null,
        previousRoles,
    });

    try {
        await member.roles.set([jailRole.id], 'Yasaklı guild tag kullandığı için kalıcı jail.');
    } catch (error) {
        punishment.active = false;
        await punishment.save().catch(() => null);
        throw error;
    }

    await member.send({
        content: [
            `**${member.guild.name}** sunucusunda yasaklı guild tag kullandığınız için kalıcı olarak jaile atıldınız.`,
            '',
            `**Yasaklı Sunucu:** ${bannedTag.name || bannedTag.guildId}${bannedTag.tag ? ` [${bannedTag.tag}]` : ''}`,
            `**Ceza Numarası:** #${punishment.caseId}`,
            '',
            'Bu guild tagini bıraktığınızda jailiniz bot tarafından otomatik açılacak ve kayıt edileceksiniz.',
            'Yasaklı guild tagini tekrar alırsanız otomatik olarak yeniden jaile atılacaksınız.',
        ].join('\n')
    }).catch(() => null);

    await sendLog(member.guild, new EmbedBuilder()
        .setTitle('Yasaklı Guild Tag Jailandı')
        .setColor(0xed4245)
        .setDescription(`${member} yasaklı guild tag kullandığı için kalıcı olarak jaillendi.`)
        .addFields(
            { name: 'Ceza Numarası', value: `#${punishment.caseId}`, inline: true },
            { name: 'Yasaklı Sunucu', value: bannedTag.name || bannedTag.guildId, inline: true },
            { name: 'Kullanıcı ID', value: member.id, inline: true }
        )
        .setTimestamp());

    return 'jailed';
}

async function releaseBannedGuildTagJail(client, member, settings, punishment) {
    const registeredRole = member.guild.roles.cache.get(settings.registeredRole);
    if (!registeredRole || registeredRole.position >= member.guild.members.me.roles.highest.position) return false;

    await member.roles.set([registeredRole.id], 'Yasaklı guild tag bırakıldı; otomatik kayıt edildi.');
    punishment.active = false;
    await punishment.save();

    await sendLog(member.guild, new EmbedBuilder()
        .setTitle('Yasaklı Guild Tag Jaili Açıldı')
        .setColor(0x57f287)
        .setDescription(`${member} yasaklı guild tagini bıraktığı için jaili açıldı ve otomatik kayıt edildi.`)
        .addFields(
            { name: 'Ceza Numarası', value: `#${punishment.caseId}`, inline: true },
            { name: 'Verilen Rol', value: `${registeredRole}`, inline: true },
            { name: 'Kullanıcı ID', value: member.id, inline: true }
        )
        .setTimestamp());

    return true;
}

async function sendLog(guild, embed) {
    const channel = guild.channels.cache.find((item) => item.name === 'jail-log');
    if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [], roles: [] } }).catch(() => null);
    }
}

module.exports = {
    findBannedGuildTag,
    getPrimaryGuildData,
    releaseBannedGuildTagJail,
    syncBannedGuildTag,
};
