const { PermissionsBitField: { Flags }, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'nuke',
    aliases: [],
    category: 'Auth',

    execute: async (client, message) => {
        if (!message.guild || !message.channel) return;

        if (!message.member.permissions.has(Flags.Administrator)) {
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
                .setFooter({ text: 'Created By Wency' })
                .setTimestamp();
            const guildIcon = message.guild.iconURL({ dynamic: true, size: 1024 });
            if (guildIcon) embed.setImage(guildIcon);

            return newChannel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Nuke komutu hatası:', error);

            return message.channel?.send({
                content: 'Bir hata oluştu.'
            }).catch(() => null);
        }
    }
};
