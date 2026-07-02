const { checkWhitelist } = require('../../../../Utils/Functions.js');
const { PermissionsBitField: { Flags } } = require('discord.js');

module.exports = async function memberUpdate(client, guild, audit, member, changes) {
  if (isPrivateRoomVoiceModeration(guild, audit, member, changes)) return;
  const safeMode = await checkWhitelist(client, member, 'memberUpdate');
  if (safeMode?.isWarn) return;
  
  const user = guild.members.cache.get(audit.targetId)
  if (!user) return;
  user.timeout(null);
}

function isPrivateRoomVoiceModeration(guild, audit, member, changes) {
  if (!changes.some((change) => change.key === 'mute' || change.key === 'deaf')) return false;
  const channel = member.voice?.channel;
  const target = guild.members.cache.get(audit.targetId);
  if (!channel || target?.voice?.channelId !== channel.id) return false;
  const overwrite = channel.permissionOverwrites.cache.get(member.id);
  return [Flags.MoveMembers, Flags.MuteMembers, Flags.DeafenMembers]
    .every((permission) => overwrite?.allow.has(permission));
}
