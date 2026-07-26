const Settings = require('../Schema/Settings');
const InviteJoin = require('../Schema/InviteJoin');

const inviteCache = new Map();
const vanityCache = new Map();

async function loadInviteCache(guild) {
    const invites = await fetchInvites(guild);
    inviteCache.set(guild.id, invites);

    const vanity = await fetchVanity(guild);
    if (vanity) vanityCache.set(guild.id, vanity);
}

async function refreshInviteCache(client) {
    for (const guild of client.guilds.cache.values()) {
        await loadInviteCache(guild).catch((error) => console.error('[INVITE_CACHE_LOAD]', error));
    }
}

async function updateInviteCache(guild) {
    await loadInviteCache(guild).catch(() => null);
}

async function logInviteJoin(member) {
    const beforeInvites = inviteCache.get(member.guild.id) || new Map();
    const beforeVanity = vanityCache.get(member.guild.id) || null;
    const afterInvites = await fetchInvites(member.guild);
    const afterVanity = await fetchVanity(member.guild);
    const usedInvite = findUsedInvite(beforeInvites, afterInvites);
    const logChannel = await getInviteLogChannel(member.guild);

    inviteCache.set(member.guild.id, afterInvites);
    if (afterVanity) vanityCache.set(member.guild.id, afterVanity);

    let joinData = {
        guildId: member.guild.id,
        userId: member.id,
        source: 'unknown',
        inviteCode: '',
        inviterId: '',
        inviterTotal: 0,
    };

    if (usedInvite?.inviterId) {
        const total = getInviterTotal(afterInvites, usedInvite.inviterId);
        joinData = {
            ...joinData,
            source: 'invite',
            inviteCode: usedInvite.code,
            inviterId: usedInvite.inviterId,
            inviterTotal: total,
        };

        await sendInviteLog(logChannel, `📥 ${member} kullanıcısı <@${usedInvite.inviterId}> tarafından sunucuya davet edildi. (${total} davete ulaştı.)`);
    } else if (afterVanity && (!beforeVanity || afterVanity.uses > beforeVanity.uses)) {
        joinData = {
            ...joinData,
            source: 'vanity',
            inviteCode: afterVanity.code || '',
        };

        await sendInviteLog(logChannel, `📥 ${member} sunucuya özel davet bağlantısı ile katıldı.`);
    } else {
        await sendInviteLog(logChannel, `📥 ${member} sunucuya katıldı fakat kimin davet ettiği bulunamadı.`);
    }

    await InviteJoin.findOneAndUpdate(
        { guildId: member.guild.id, userId: member.id },
        { $set: joinData },
        { upsert: true }
    ).catch(() => null);
}

async function logInviteLeave(member) {
    const logChannel = await getInviteLogChannel(member.guild);
    const data = await InviteJoin.findOne({ guildId: member.guild.id, userId: member.id }).sort({ updatedAt: -1 }).catch(() => null);

    if (data?.source === 'invite' && data.inviterId) {
        await sendInviteLog(logChannel, `📤 ${member} sunucumuzdan ayrıldı! <@${data.inviterId}> tarafından davet edilmişti.`);
    } else if (data?.source === 'vanity') {
        await sendInviteLog(logChannel, `📤 ${member} sunucumuzdan ayrıldı! Sunucuya özel davet bağlantısı ile katılmıştı.`);
    } else {
        await sendInviteLog(logChannel, `📤 ${member} sunucudan ayrıldı fakat kimin davet ettiği bulunamadı.`);
    }

    await InviteJoin.deleteOne({ guildId: member.guild.id, userId: member.id }).catch(() => null);
}

async function getInviteLogChannel(guild) {
    const document = await Settings.findOne({ id: guild.id }).catch(() => null);
    return guild.channels.cache.get(document?.inviteLogChannel)
        || guild.channels.cache.find((channel) => channel.name === 'invite-log');
}

async function sendInviteLog(channel, content) {
    if (!channel?.isTextBased()) return;
    await channel.send({ content, allowedMentions: { parse: ['users'] } }).catch(() => null);
}

async function fetchInvites(guild) {
    const invites = await guild.invites.fetch().catch(() => null);
    const map = new Map();
    if (!invites) return map;

    invites.forEach((invite) => {
        map.set(invite.code, {
            code: invite.code,
            uses: invite.uses || 0,
            inviterId: invite.inviter?.id || '',
        });
    });

    return map;
}

async function fetchVanity(guild) {
    if (!guild.features?.includes('VANITY_URL')) return null;
    const vanity = await guild.fetchVanityData().catch(() => null);
    if (!vanity?.code) return null;
    return { code: vanity.code, uses: vanity.uses || 0 };
}

function findUsedInvite(beforeInvites, afterInvites) {
    for (const invite of afterInvites.values()) {
        const oldUses = beforeInvites.get(invite.code)?.uses || 0;
        if (invite.uses > oldUses) return invite;
    }

    return null;
}

function getInviterTotal(invites, inviterId) {
    let total = 0;
    invites.forEach((invite) => {
        if (invite.inviterId === inviterId) total += invite.uses;
    });

    return total;
}

module.exports = {
    refreshInviteCache,
    updateInviteCache,
    logInviteJoin,
    logInviteLeave,
};
