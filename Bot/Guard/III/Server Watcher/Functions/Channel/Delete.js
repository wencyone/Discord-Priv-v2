const { GuildAuditLogsEntry, Guild } = require('discord.js');
const channelModel = require('../../../../../Schema/ChannelModel.js');
const { checkWhitelist, createChannel, isPrivateRoomBackupChannel } = require('../../../../Utils/Functions.js');

module.exports = async function channelDelete(client, guild = Guild.prototype, audit = GuildAuditLogsEntry.prototype, member, changes, wency) {
	if (await isPrivateRoomBackupChannel(guild, audit?.target || audit?.targetId)) {
		await channelModel.deleteOne({ guild: guild.id, channel: audit.targetId }).catch(() => null);
		return;
	}

	const safeMode = await checkWhitelist(client, member, 'channel');
	const isBlacklisted = (wency?.blackListedChannels || []).some((item) => (item?.id || item) === audit?.targetId);
	if (safeMode?.isWarn && !isBlacklisted) {
		await channelModel.updateOne(
			{ guild: guild.id, channel: audit.targetId },
			{ $set: { isDeleted: true, deletedTimestamp: Date.now() } },
			{ $upsert: true }
		);
		return;
	}

	const document = await channelModel.findOne({ guild: guild.id, channel: audit.targetId });
	if (!document) return;

	await createChannel(client, document);
};
