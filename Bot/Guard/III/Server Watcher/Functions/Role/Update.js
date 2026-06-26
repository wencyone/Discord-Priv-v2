const { PermissionsBitField } = require('discord.js');
const { checkWhitelist, backupRole } = require('../../../../Utils/Functions.js');

module.exports = async function roleUpdate(client, guild, audit, member, changes, wency) {
	const safeMode = await checkWhitelist(client, member, 'role');
	if (safeMode?.isWarn) {
		if (!member?.user?.bot) await backupRole(guild, audit.targetId);
		return;
	}

	const role = audit.target;
	const detailedChanges = {};

	const oldValue = (key) => changes.find((change) => change.key === key)?.old;
	if (oldValue('name') !== undefined) detailedChanges.name = oldValue('name');
	if (oldValue('color') !== undefined) detailedChanges.color = oldValue('color');
	if (oldValue('hoist') !== undefined) detailedChanges.hoist = oldValue('hoist');
	if (oldValue('mentionable') !== undefined) detailedChanges.mentionable = oldValue('mentionable');
	if (oldValue('permissions') !== undefined) detailedChanges.permissions = new PermissionsBitField(BigInt(oldValue('permissions')));

	if (Object.values(detailedChanges).length > 0) await role.edit(detailedChanges, 'Wency ~ Guvenlik Sistemi').catch(() => null);
	if (oldValue('position') !== undefined) await role.setPosition(oldValue('position'), 'Wency ~ Guvenlik Sistemi').catch(() => null);
};
