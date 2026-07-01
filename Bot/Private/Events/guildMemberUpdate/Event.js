const {
    AuditLogEvent,
    ContainerBuilder,
    Events,
    MessageFlags,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
} = require('discord.js');
const UserModel = require('../../../Schema/User');
const { sendTimeoutLog } = require('../../../Base/TimeoutLog');
const Settings = require('../../../Schema/Settings');
const { syncBannedGuildTag } = require('../../../Base/BannedGuildTag');

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const settings = await Settings.findOne({ id: newMember.guild.id }).catch(() => null);
    if (settings?.autoRole && settings.bannedGuildTags?.length) {
        const tagStatus = await syncBannedGuildTag(client, newMember, settings, newMember.user).catch(() => 'blocked');
        if (tagStatus === 'jailed' || tagStatus === 'blocked' || tagStatus === 'released') return;
    }

    await logRightClickTimeout(oldMember, newMember);

    const removedRoles = oldMember.roles.cache.difference(newMember.roles.cache);
    const addedRoles = newMember.roles.cache.difference(oldMember.roles.cache);
    if (!removedRoles.size && !addedRoles.size) return;

    const entry = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate })
        .then((audit) => audit.entries.first())
        .catch(() => null);
    if (!entry?.executor || entry.targetId !== newMember.id || Date.now() - entry.createdTimestamp > 5000) return;

    const now = Date.now();
    if (addedRoles.size) await saveAndLog(newMember, entry.executor, addedRoles, false, now);
    if (removedRoles.size) await saveAndLog(newMember, entry.executor, removedRoles, true, now);
});

async function logRightClickTimeout(oldMember, newMember) {
    const oldUntil = oldMember.communicationDisabledUntilTimestamp || 0;
    const newUntil = newMember.communicationDisabledUntilTimestamp || 0;
    if (newUntil <= Date.now() || newUntil === oldUntil) return;

    await new Promise((resolve) => setTimeout(resolve, 750));
    const entry = await newMember.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberUpdate })
        .then((audit) => audit.entries.find((item) => {
            if (item.targetId !== newMember.id || Date.now() - item.createdTimestamp > 10000) return false;
            return item.changes?.some((change) => change.key === 'communication_disabled_until');
        }))
        .catch(() => null);

    if (!entry?.executor || entry.executor.id === client.user.id) return;

    await sendTimeoutLog(newMember.guild, newMember, entry.executor, {
        source: 'Sağ Tık',
        duration: Math.max(0, newUntil - Date.now()),
        reason: entry.reason || 'Sebep belirtilmedi',
        expiresAt: new Date(newUntil),
    });
}

async function saveAndLog(member, executor, roles, isRemove, timestamp) {
    await UserModel.updateOne(
        { id: member.id },
        {
            $push: {
                roleLogs: {
                    type: isRemove ? 'remove' : 'add',
                    roles: roles.map((role) => role.id),
                    staff: executor.id,
                    date: timestamp,
                }
            }
        },
        { upsert: true }
    );

    const channel = member.guild.channels.cache.find((item) => item.name === 'rol-log');
    if (!channel?.isTextBased()) return;

    const roleMentions = roles.map((role) => `${role}`).join(', ');
    const container = new ContainerBuilder()
        .setAccentColor(isRemove ? 0xed4245 : 0x45c486)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent([
                        `# ${isRemove ? '🔴 Rol Alındı' : '🟢 Rol Verildi'}`,
                        isRemove
                            ? `${member} kullanıcısından **rol alındı**`
                            : `${member} kullanıcısına **rol verildi**`,
                        '',
                        `**Rol:** ${roleMentions}`,
                        `**Yetkili:** <@${executor.id}>`,
                        '',
                        `**ID:** ${member.id} • <t:${Math.floor(timestamp / 1000)}:F>`,
                    ].join('\n'))
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ extension: 'png', size: 1024 }))
                )
        );

    await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [] },
    }).catch(() => null);
}
