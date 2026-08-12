const { Events } = require('discord.js');
const Settings = require('../../../Schema/Settings');
const Punishment = require('../../../Schema/Punishment');
const { releaseJail } = require('../../../Base/Jail');
const { createMemberLog } = require('../../../Base/MemberLog');
const { isBannedGuildTagSystemEnabled, syncBannedGuildTag } = require('../../../Base/BannedGuildTag');
const { syncGuildTagRole } = require('../../../Base/GuildTagRole');
const { logInviteJoin } = require('../../../Base/InviteLog');


client.on(Events.GuildMemberAdd, async (member) => {

    const channel = member.guild.channels.cache.find((item) => item.name === 'giriş-çıkış-log');
    if (channel?.isTextBased()) channel.send(createMemberLog(member, true)).catch(() => null);
    await logInviteJoin(member).catch((error) => console.error('[INVITE_JOIN_LOG]', error));

    const document = await Settings.findOne({ id: member.guild.id });
    if (!document) return;

    if (isBannedGuildTagSystemEnabled(document) && document.bannedGuildTags?.length) {
        const user = await client.users.fetch(member.id, { force: true }).catch(() => member.user);
        const tagStatus = await syncBannedGuildTag(client, member, document, user).catch((error) => {
            console.error('[BANNED_GUILD_TAG_JOIN]', error);
            return 'blocked';
        });
        if (tagStatus === 'jailed' || tagStatus === 'blocked' || tagStatus === 'released') return;
    }

    if (document.guildTagRole) {
        const user = await client.users.fetch(member.id, { force: true }).catch(() => member.user);
        await syncGuildTagRole(member, document, user).catch((error) => console.error('[GUILD_TAG_ROLE_JOIN]', error));
    }

    const activeJail = await Punishment.findOne({
        guildId: member.guild.id,
        userId: member.id,
        type: 'jail',
        active: true
    }).sort({ caseId: -1 }).catch(() => null);

    if (activeJail) {
        if (activeJail.expiresAt && activeJail.expiresAt.getTime() <= Date.now()) {
            await releaseJail(client, activeJail, true).catch((error) => console.error('[JAIL_REJOIN_RELEASE]', error));
            return;
        }

        const jailRole = member.guild.roles.cache.get(document.jailRole);
        if (jailRole && jailRole.position < member.guild.members.me.roles.highest.position) {
            await member.roles.set([jailRole.id], 'Aktif jail cezası devam ederken sunucuya tekrar katıldı.').catch((error) => console.error('[JAIL_REJOIN_ROLE]', error));
            await member.send({ content: 'Jailliyken sunucudan çıktığınız için tekrar jaile atıldınız.' }).catch(() => null);
            return;
        }
    }

    if (document.autoRole) {
        if (document.registeredRole) await member.roles.add(document.registeredRole).catch(() => null);
        return;
    }

    if (!document.genderSystem && !document.buttonRegister) return;

    if (document.genderSystem && document.welcomeChannel) {
        const welcomeChannel = member.guild.channels.cache.get(document.welcomeChannel);
        const registerInfoChannel = member.guild.channels.cache.find((channel) => channel.name === 'nasıl-kayıt-olurum' || channel.name === 'nasil-kayit-olurum');
        const registerInfoText = registerInfoChannel ? `${registerInfoChannel}` : '#nasıl-kayıt-olurum';

        if (welcomeChannel?.isTextBased()) {
            welcomeChannel.send({
                content: `Sunucumuza hoşgeldin ${member} ses gir kayıt ol kayıt olurken de ${registerInfoText} kanalını oku, Eğer tanıdığın biri varsa etiketle o kayıt eder.❤️`
            }).catch(() => null);
        }
    }

    if (document.mentionChannelIds?.length) {
        for (const channelId of document.mentionChannelIds) {
            const mentionChannel = member.guild.channels.cache.get(channelId);
            if (!mentionChannel?.isTextBased()) continue;
            mentionChannel.send({ content: `${member}` })
                .then((msg) => setTimeout(() => msg.delete().catch(() => {}), 2000))
                .catch(() => {});
        }
    }

    if (document.unregisteredRole) await member.roles.add(document.unregisteredRole).catch(() => null);
})
