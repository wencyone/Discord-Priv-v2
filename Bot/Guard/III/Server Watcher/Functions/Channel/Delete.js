const { GuildAuditLogsEntry, Guild } = require('discord.js');
const channelModel = require('../../../../../Schema/ChannelModel.js');
const { checkWhitelist, createChannel } = require('../../../../Utils/Functions.js');

module.exports = async function channelDelete(client, guild = Guild.prototype, audit = GuildAuditLogsEntry.prototype, member, changes, wency) {
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