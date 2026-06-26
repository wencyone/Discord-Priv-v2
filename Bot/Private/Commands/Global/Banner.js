const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'banner',
    aliases: [],
    category: 'General',

    execute: async (client, message, args, wency, embed) => {
        const member = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;
        if (!member) return message.channel.send({ content: 'Bir kullanıcı belirtmelisin.' });

        const banner = await bannerURL(member.id, client).catch(() => null);
        if (!banner) return message.channel.send({ content: 'Bu kullanıcının bannerı bulunamadı.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Resim Adresi')
                .setStyle(ButtonStyle.Link)
                .setURL(banner)
        );

        message.channel.send({
            embeds: [
                new EmbedBuilder({
                    author: { name: member.username, iconURL: member.displayAvatarURL({ extension: 'png', size: 4096 }) },
                    image: { url: banner },
                })
            ],
            components: [row]
        });
    }
}

async function bannerURL(user, client) {
    const response = await axios.get(`https://discord.com/api/v9/users/${user}`, { headers: { 'Authorization': `Bot ${client.token}` } });
    if (!response.data.banner) return
    if (response.data.banner.startsWith('a_')) return `https://cdn.discordapp.com/banners/${response.data.id}/${response.data.banner}.gif?size=4096`
    else return (`https://cdn.discordapp.com/banners/${response.data.id}/${response.data.banner}.png?size=4096`)
}
