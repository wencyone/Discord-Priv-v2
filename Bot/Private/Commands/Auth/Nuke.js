const { PermissionsBitField: { Flags }, EmbedBuilder } = require('discord.js');
const NUKE_GIF = 'https://cdn.discordapp.com/attachments/1420404232724414606/1462219462492291133/Adsz_video_Clipchamp_ile_yapld_1.gif?ex=6a4f7ebe&is=6a4e2d3e&hm=cd161655dec9bd47c20375b3176a6a189801467277d804d23ef0158b36a045f1&';

module.exports = {
    name: 'nuke',
    aliases: [],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!message.guild || !message.channel) return;

        if (!message.member.permissions.has(Flags.Administrator) && !wency?.banAuth?.some((roleId) => message.member.roles.cache.has(roleId))) {
            return message.reply({ content: 'Yetkin yok.' });
        }

        const guild = message.guild;
        const oldChannel = message.channel;

        try {
            const position = oldChannel.position;

            // Eski kanal System Messages Channel mı?
            const wasSystemChannel = guild.systemChannelId === oldChannel.id;

            const newChannel = await oldChannel.clone({
                name: oldChannel.name,
                reason: `${message.author.tag} tarafından nuke atıldı.`
            });

            await newChannel.setPosition(position).catch(() => null);

            await oldChannel.delete(`${message.author.tag} tarafından nuke atıldı.`);

            // Yeni kanalı tekrar Engagement / System Messages Channel olarak ayarla
            if (wasSystemChannel) {
                await guild.setSystemChannel(newChannel).catch((err) => {
                    console.log('System Messages Channel ayarlanamadı:', err);
                });
            }

            const embed = new EmbedBuilder()
                .setColor('Red')
                .setDescription(`💥 Bu kanal ${message.author} tarafından nukelendi!`)
                .setImage(NUKE_GIF)
                .setFooter({ text: 'Created By Wency' })
                .setTimestamp();

            return newChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Nuke komutu hatası:', error);

            return message.channel?.send({
                content: 'Bir hata oluştu.'
            }).catch(() => null);
        }
    }
};
