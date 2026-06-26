const { checkWhitelist, backupRole } = require('../../../../Utils/Functions.js');

module.exports = async function channelOverwriteCreate(client, guild, audit, member, changes) {
    const safeMode = await checkWhitelist(client, member, 'channel');
    if (safeMode?.isWarn) {
        const overwriteId = changes.find((change) => change.key === 'id')?.new || audit.extra?.id;
        if (!member?.user?.bot && overwriteId && guild.roles.cache.has(overwriteId)) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            await backupRole(guild, overwriteId);
        }
        return;
    }

    const targetChannel = guild.channels.cache.get(audit.targetId);
    if (targetChannel) await targetChannel.permissionOverwrites.delete(`${changes.find((x) => x.key == 'id')?.new}`).catch(() => { });
};
