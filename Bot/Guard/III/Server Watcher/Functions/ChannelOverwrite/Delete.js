const { checkWhitelist, backupRole } = require('../../../../Utils/Functions.js');

module.exports = async function channelOverwriteDelete(client, guild, audit, member, changes, wency) {
    const safeMode = await checkWhitelist(client, member, 'channel');
    if (safeMode?.isWarn) {
        const overwriteId = changes.find((change) => change.key === 'id')?.old || audit.extra?.id;
        if (!member?.user?.bot && overwriteId && guild.roles.cache.has(overwriteId)) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            await backupRole(guild, overwriteId);
        }
        return;
    }

    const channel = guild.channels.cache.get(audit.targetId);
    let newOverwrites = {};
    changes.forEach((change) => {
        if (change.key === 'allow') {
            newOverwrites[change?.old] = true;
        } else if (change.key === 'deny') {
            newOverwrites[change?.old] = false;
        }
    });
	if (channel?.permissionOverwrites) {
		await channel.permissionOverwrites.create(`${changes.find((x) => x.key == 'id')?.old || audit.extra?.id}`, newOverwrites).catch(() => null);
	}
};
