const { Events } = require('discord.js');
const { createMemberLog } = require('../../../Base/MemberLog');

client.on(Events.GuildMemberRemove, async (member) => {

    const channel = member.guild.channels.cache.find((item) => item.name === 'giriş-çıkış-log');
    if (channel?.isTextBased()) channel.send(createMemberLog(member, false)).catch(() => null);
})
