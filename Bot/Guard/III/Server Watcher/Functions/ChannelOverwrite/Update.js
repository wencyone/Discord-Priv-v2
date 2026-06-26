const { checkWhitelist, backupRole } = require('../../../../Utils/Functions.js');

module.exports = async function channelOverwriteUpdate(client, guild, audit, member, changes) {
    const safeMode = await checkWhitelist(client, member, 'channel');
    if (safeMode?.isWarn) {
        const overwriteId = audit.extra?.id || changes.find((change) => change.key === 'id')?.new;
        if (!member?.user?.bot && overwriteId && guild.roles.cache.has(overwriteId)) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            await backupRole(guild, overwriteId);
        }
        return;
    }

    const channel = audit.target;
    let oldWrites = {};

    changes.forEach(change => {
        if (change.key === 'allow') {
            oldWrites[change.old] = true;
        } else if (change.key === 'deny') {
            oldWrites[change.old] = false;
        }
    });

	if (channel?.permissionOverwrites) {
		await channel.permissionOverwrites.edit(audit.extra?.id || audit.extra, oldWrites).catch(() => null);
	}
};
