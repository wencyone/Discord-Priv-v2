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
    if (!isBannedGuildTagSystemEnabled(settings)) return 'disabled';

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
            await disconnectVoice(member);
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
    if (!jailRole || jailRole.position >= member.guild.members.me.roles.highest.position) {
        await sendBannedGuildTagLog(member.guild, createBannedGuildTagLog(member, {
            color: 0xed4245,
            title: 'Yasaklı Guild Tag İşlemi Uygulanamadı',
            description: `${member} yasaklı guild tag kullandı fakat jail rolü verilemedi.`,
            fields: [
                { name: 'Yasaklı Sunucu', value: bannedTag.name || bannedTag.guildId, inline: true },
                { name: 'Kullanıcı ID', value: member.id, inline: true },
            ],
        }));
        return 'blocked';
    }

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
        previousNickname: member.nickname,
    });

    try {
        await member.roles.set([jailRole.id], 'Yasaklı guild tag kullandığı için kalıcı jail.');
        await member.setNickname('Jail', 'Yasaklı guild tag kullandığı için kalıcı jail.');
        await disconnectVoice(member);
    } catch (error) {
        await member.roles.set(previousRoles, 'Başarısız jail işlemi geri alındı.').catch(() => null);
        await member.setNickname(punishment.previousNickname, 'Başarısız jail işlemi geri alındı.').catch(() => null);
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
            'Bu guild tagini bıraktığınızda jailiniz bot tarafından otomatik açılacak ve sunucunun kayıt sistemine göre rolünüz düzenlenecek.',
            'Yasaklı guild tagini tekrar alırsanız otomatik olarak yeniden jaile atılacaksınız.',
        ].join('\n')
    }).catch(() => null);

    await sendBannedGuildTagLog(member.guild, createBannedGuildTagLog(member, {
        color: 0xed4245,
        title: 'Yasaklı Guild Tag Jailandı',
        description: `${member} yasaklı guild tag kullandığı için kalıcı olarak jaillendi.`,
        fields: [
            { name: 'Ceza Numarası', value: `#${punishment.caseId}`, inline: true },
            { name: 'Yasaklı Sunucu', value: bannedTag.name || bannedTag.guildId, inline: true },
            { name: 'Kullanıcı ID', value: member.id, inline: true },
        ],
    }));

    return 'jailed';
}

async function releaseBannedGuildTagJail(client, member, settings, punishment) {
    const releaseData = getBannedGuildTagReleaseData(member, settings);
    if (!releaseData) return false;

    await member.roles.set(releaseData.roleIds, 'Yasaklı guild tag bırakıldı; kayıt sistemine göre rol verildi.');
    punishment.active = false;
    await punishment.save();

    await sendBannedGuildTagLog(member.guild, createBannedGuildTagLog(member, {
        color: 0x57f287,
        title: 'Yasaklı Guild Tag Jaili Açıldı',
        description: `${member} yasaklı guild tagini bıraktığı için jaili açıldı.`,
        fields: [
            { name: 'Ceza Numarası', value: `#${punishment.caseId}`, inline: true },
            { name: 'Kayıt Sistemi', value: releaseData.system, inline: true },
            { name: 'Verilen Rol', value: releaseData.roleText, inline: true },
            { name: 'Kullanıcı ID', value: member.id, inline: true },
        ],
    }));

    return true;
}

function getBannedGuildTagReleaseData(member, settings) {
    if (settings.autoRole) {
        const registeredRole = member.guild.roles.cache.get(settings.registeredRole);
        if (!canManageRole(member, registeredRole)) return null;

        return {
            roleIds: [registeredRole.id],
            roleText: `${registeredRole}`,
            system: 'Otomatik Kayıt',
        };
    }

    if (settings.genderSystem || settings.buttonRegister) {
        const unregisteredRole = member.guild.roles.cache.get(settings.unregisteredRole);
        if (!unregisteredRole) {
            return {
                roleIds: [],
                roleText: 'Rol verilmedi',
                system: settings.buttonRegister ? 'Butonlu Kayıt' : 'Manuel Kayıt',
            };
        }
        if (!canManageRole(member, unregisteredRole)) return null;

        return {
            roleIds: [unregisteredRole.id],
            roleText: `${unregisteredRole}`,
            system: settings.buttonRegister ? 'Butonlu Kayıt' : 'Manuel Kayıt',
        };
    }

    return {
        roleIds: [],
        roleText: 'Rol verilmedi',
        system: 'Kayıt Sistemi Kapalı',
    };
}

function canManageRole(member, role) {
    return role && role.position < member.guild.members.me.roles.highest.position;
}

function isBannedGuildTagSystemEnabled(settings) {
    return Boolean(settings?.autoRole || settings?.genderSystem || settings?.buttonRegister);
}

async function disconnectVoice(member) {
    if (!member.voice?.channelId) return false;
    await member.voice.disconnect('Yasaklı guild tag tespit edildi.').catch(() => null);
    return true;
}

function createBannedGuildTagLog(member, data) {
    return new EmbedBuilder()
        .setTitle(data.title)
        .setColor(data.color)
        .setDescription(data.description)
        .addFields(data.fields)
        .setTimestamp();
}

async function sendBannedGuildTagLog(guild, embed) {
    const channel = guild.channels.cache.find((item) => item.name === 'yasaklı-tag-log' || item.name === 'yasakli-tag-log');
    if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [], roles: [] } }).catch(() => null);
    }
}

module.exports = {
    findBannedGuildTag,
    getPrimaryGuildData,
    isBannedGuildTagSystemEnabled,
    releaseBannedGuildTagJail,
    syncBannedGuildTag,
};
