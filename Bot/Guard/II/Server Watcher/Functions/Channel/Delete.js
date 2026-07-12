const { checkWhitelist, punish, isPrivateRoomBackupChannel } = require('../../../../Utils/Functions.js');

module.exports = async function channelDelete(client, guild, audit, member, changes) {
  if (await isPrivateRoomBackupChannel(guild, audit?.target || audit?.targetId)) return;

  const safeMode = await checkWhitelist(client, member, 'channel');
  if (safeMode && !safeMode.isWarn) await punish(client, member, safeMode.punishType, 'Kanal Silindi!');
  else if (!safeMode) await punish(client, member, 3, 'Kanal Silindi!');
};
