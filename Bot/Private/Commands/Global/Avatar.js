const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'avatar',
    aliases: ['av', 'pp'],
    category: 'General',

    execute: async (client, message, args, wency, embed) => {
        const member = message.mentions.members.first()
            || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null)
            || message.member;

        if (!member) return message.channel.send({ content: 'Kullanıcı bulunamadı!' });

        const user = member.user || member;
        const avatar = user.displayAvatarURL({ extension: user.avatar?.startsWith('a_') ? 'gif' : 'png', size: 4096 });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Resim Adresi')
                .setStyle(ButtonStyle.Link)
                .setURL(avatar)
        );

        message.channel.send({
            embeds: [
                new EmbedBuilder({
                    author: { name: user.username, iconURL: user.displayAvatarURL({ extension: 'png', size: 4096 }) },
                    color: client.getColor ? client.getColor('random') : undefined,
                    image: { url: avatar }
                })
            ],
            components: [row]
        });
    }
};