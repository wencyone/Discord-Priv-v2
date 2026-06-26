const {
    PermissionsBitField: { Flags },
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ComponentType,
    ChannelType
} = require('discord.js');

module.exports = {
    name: 'toplucek',
    aliases: ['topluçek', 'toplu-cek', 'toplu-çek'],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!message.guild || !message.member) return;

        const configuredAuthRoles = Array.isArray(wency?.auth) ? wency.auth : [];
        const hasConfiguredRole = configuredAuthRoles.some((roleId) => message.member.roles.cache.has(roleId));
        if (!message.member.permissions.has(Flags.Administrator) && !hasConfiguredRole) {
            return message.reply({ content: 'Bu komutu kullanmak için `.kur` menüsündeki Diğer Yetkililer rollerinden birine sahip olmalısın.' });
        }

        const ownChannel = message.member.voice.channel;

        if (!ownChannel) {
            return message.reply({
                content: 'Önce bir ses kanalına girmen gerekiyor.'
            });
        }

        const sourceChannel =
            message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[0]);

        if (!sourceChannel || sourceChannel.type !== ChannelType.GuildVoice) {
            return message.reply({
                content: 'Geçerli bir ses kanalı etiketle veya ID gir. Örnek: `.toplucek #ses-kanalı`'
            });
        }

        if (sourceChannel.id === ownChannel.id) {
            return message.reply({
                content: 'Zaten o ses kanalındasın.'
            });
        }

        const members = sourceChannel.members.filter(member => !member.user.bot);

        if (!members.size) {
            return message.reply({
                content: 'Bu ses kanalında taşınacak kullanıcı yok.'
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('toplucek_onay')
                .setLabel('Onayla')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('toplucek_reddet')
                .setLabel('Reddet')
                .setStyle(ButtonStyle.Danger)
        );

        const msg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('Blue')
                    .setTitle('Toplu Çekme Onayı')
                    .setDescription(
                        `${sourceChannel} kanalındaki **${members.size} kişi**, ${ownChannel} kanalına çekilecek.\n\nOnaylıyor musun?`
                    )
                    .setFooter({ text: 'Created By Wency' })
                    .setTimestamp()
            ],
            components: [row]
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000
        });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({
                    content: 'Bu butonu sadece komutu kullanan kişi kullanabilir.',
                    ephemeral: true
                }).catch(() => null);
            }

            if (interaction.customId === 'toplucek_reddet') {
                collector.stop();

                return interaction.update({
                    content: 'İşlem iptal edildi.',
                    embeds: [],
                    components: []
                }).catch(() => null);
            }

            if (interaction.customId === 'toplucek_onay') {
                collector.stop();

                let moved = 0;
                let failed = 0;

                for (const member of members.values()) {
                    try {
                        await member.voice.setChannel(
                            ownChannel,
                            `${message.author.tag} toplu çek kullandı.`
                        );
                        moved++;
                    } catch {
                        failed++;
                    }
                }

                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Green')
                            .setTitle('Toplu Çekme Tamamlandı')
                            .setDescription(
                                `✅ **${moved} kişi** ${ownChannel} kanalına çekildi.\n${failed > 0 ? `❌ **${failed} kişi** çekilemedi.` : ''}`
                            )
                            .setFooter({ text: 'Created By Wency' })
                            .setTimestamp()
                    ],
                    components: []
                }).catch(() => null);
            }
        });

        collector.on('end', async collected => {
            if (collected.size > 0) return;

            await msg.edit({
                content: 'Süre dolduğu için işlem iptal edildi.',
                embeds: [],
                components: []
            }).catch(() => null);
        });
    }
};
