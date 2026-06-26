const { Events } = require('discord.js');

client.on(Events.GuildMemberRemove, async (member) => {

    const channel = member.guild.channels.cache.find(r => r.name === 'giriş-çıkış-log');
    if (channel) channel.send({ content: `<:redtick:1515149883701592186> ${member} (${member.id}) sunucudan ayrıldı.` })
})