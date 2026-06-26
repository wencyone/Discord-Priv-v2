const { checkWhitelist, createRole } = require('../../../../Utils/Functions.js');
const roleModel = require('../../../../../Schema/RoleModel.js');

module.exports = async function roleDelete(client, guild, audit, member, changes, wency) {
	const safeMode = await checkWhitelist(client, member, 'role');

	const isBlacklisted = (wency?.blackListedRoles || [])
		.flat(Infinity)
		.some((item) => (item?.id || item) === audit?.targetId);
	if (safeMode?.isWarn && !isBlacklisted) {
		await roleModel.updateOne(
			{ guild: guild.id, role: audit.targetId },
			{ $set: { isDeleted: true, deletedTimestamp: Date.now() } },
			{ $upsert: true }
		);
		return;
	}

	let document = await roleModel.findOne({ guild: guild.id, role: audit.targetId });
	if (!document) {
		const oldValue = (key, fallback) => changes.find((change) => change.key === key)?.old ?? fallback;
		document = {
			guild: guild.id,
			role: audit.targetId,
			name: oldValue('name', `Kurtarilan Rol ${audit.targetId.slice(-4)}`),
			color: oldValue('color', 0),
			position: oldValue('position', 1),
			permissions: String(oldValue('permissions', '0')),
			hoist: Boolean(oldValue('hoist', false)),
			mentionable: Boolean(oldValue('mentionable', false)),
			members: [],
			channelOverwrites: []
		};
		console.warn(`[ROLE RESTORE] ${audit.targetId} ID'li rolun tam yedegi yok; audit verisiyle temel rol geri kurulacak.`);
	}

	await createRole(client, document, true);
};
