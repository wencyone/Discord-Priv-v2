const {
    PermissionsBitField: { Flags },
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    bold,
    inlineCode
} = require('discord.js');

module.exports = {
    name: 'muteall',
    aliases: ['allmute'],
    category: 'Advanced',

    execute: async (client, message, args, wency, embed) => {
        // Owner kontrolü
        if (!global.system.ownerID.includes(message.author.id))
            return message.reply({ content: 'Bu komutu sadece bot sahipleri kullanabilir.' });

        // Ses kanalı kontrolü
        if (!message.member?.voice?.channelId)
            return message.reply({ content: 'Bir ses kanalında bulunman gerekiyor.' });

        const channel = message.member.voice.channel;
        if (!channel)
            return message.reply({ content: 'Ses kanalı bulunamadı.' });
        if (channel.members.size <= 3)
            return message.reply({ content: 'Kanalda 3\'ten fazla kişi olmalı.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mute')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji({ id: '1301943774653448192' }),
            new ButtonBuilder()
                .setCustomId('unmute')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji({ id: '1301943787832213544' })
        );

        const question = await message.channel.send({
            embeds: [
                embed.setDescription(
                    `${channel} ${inlineCode(channel.id)} adlı kanalda sesteki kullanıcılara yapacağınız işlemi seçin.`
                )
            ],
            components: [row]
        });

        const collector = question.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id && i.isButton(),
            time: 1000 * 60 * 5,
            componentType: ComponentType.Button
        });

        collector.on('collect', async (i) => {
            await i.deferUpdate();

            if (i.customId === 'mute') {
                channel.members
                    .filter(m => m.id !== message.member.id && !m.voice.serverMute)
                    .forEach(m => m.voice.setMute(true, message.author.displayName));

                await message.channel.send({
                    embeds: [
                        embed.setDescription(
                            `${channel} adlı kanaldaki herkesin konuşması ${bold('kapatıldı')}.`
                        )
                    ]
                });
            }

            if (i.customId === 'unmute') {
                channel.members
                    .filter(m => m.id !== message.member.id && m.voice?.serverMute)
                    .forEach(m => m.voice.setMute(false, message.author.displayName));

                await message.channel.send({
                    embeds: [
                        embed.setDescription(
                            `${channel} adlı kanaldaki herkesin konuşması ${bold('açıldı')}.`
                        )
                    ]
                });
            }
        });

        collector.on('end', async () => {
            await question.edit({
                embeds: [
                    embed.setDescription(
                        `${channel} ${inlineCode(channel.id)} adlı kanalda sesteki kullanıcılara yapacağınız işlemi seçin.`
                    )
                ],
                components: [client.functions.timesUp()]
            }).catch(() => null);
        });
    }
};
