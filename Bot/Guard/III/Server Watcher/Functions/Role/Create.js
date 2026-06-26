const { checkWhitelist, backupRole } = require('../../../../Utils/Functions.js');

module.exports = async function roleCreate(client, guild, audit, member, changes, wency) {
	const safeMode = await checkWhitelist(client, member, 'role');
	if (safeMode?.isWarn) {
		if (!member?.user?.bot) await backupRole(guild, audit.targetId, { includeMembers: true });
		return;
	}
	
	await guild.roles.cache.get(audit.targetId)?.delete({ reason: 'Wency ~ Güvenlik Sistemi' }).catch(() => null);
};
