const {
    PermissionsBitField: { Flags },
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChannelType,
    ComponentType
} = require('discord.js');

module.exports = {
    name: 'toplutasi',
    aliases: ['toplutaşı', 'toplutasi', 'toplutaşi'],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!message.guild || !message.member) return;

        const configuredAuthRoles = Array.isArray(wency?.auth) ? wency.auth : [];
        const hasConfiguredRole = configuredAuthRoles.some((roleId) => message.member.roles.cache.has(roleId));
        if (!message.member.permissions.has(Flags.Administrator) && !hasConfiguredRole) {
            return message.reply({ content: 'Bu komutu kullanmak için `.kur` menüsündeki Yetkililer rollerinden birine sahip olmalısın.' });
        }

        const sourceChannel = message.member.voice.channel;

        if (!sourceChannel) {
            return message.reply({
                content: 'Önce bir ses kanalına girmen gerekiyor.'
            });
        }

        const targetChannel =
            message.mentions.channels.first() ||
            message.guild.channels.cache.get(args[0]);

        if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
            return message.reply({
                content: 'Geçerli bir ses kanalı etiketlemelisin. Örnek: `.toplutasi #ses-kanalı`'
            });
        }

        if (sourceChannel.id === targetChannel.id) {
            return message.reply({
                content: 'Zaten aynı ses kanalındasınız.'
            });
        }

        const members = sourceChannel.members.filter(member => !member.user.bot);

        if (!members.size) {
            return message.reply({
                content: 'Taşınacak kullanıcı bulunamadı.'
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('toplutasi_onay')
                .setLabel('Onayla')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('toplutasi_reddet')
                .setLabel('Reddet')
                .setStyle(ButtonStyle.Danger)
        );

        const question = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('Toplu Taşıma Onayı')
                    .setDescription(
                        `${sourceChannel} kanalındaki **${members.size} kişi**, ${targetChannel} kanalına taşınacak.\n\nOnaylıyor musun?`
                    )
                    .setFooter({ text: 'Created By Wency' })
                    .setTimestamp()
            ],
            components: [row]
        });

        const collector = question.createMessageComponentCollector({
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

            if (interaction.customId === 'toplutasi_reddet') {
                collector.stop();

                return interaction.update({
                    content: 'İşlem iptal edildi.',
                    embeds: [],
                    components: []
                }).catch(() => null);
            }

            if (interaction.customId === 'toplutasi_onay') {
                collector.stop();

                let moved = 0;
                let failed = 0;

                for (const member of members.values()) {
                    try {
                        await member.voice.setChannel(targetChannel, `${message.author.tag} toplu taşıma kullandı.`);
                        moved++;
                    } catch {
                        failed++;
                    }
                }

                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Green')
                            .setTitle('Toplu Taşıma Tamamlandı')
                            .setDescription(
                                `✅ **${moved} kişi** ${targetChannel} kanalına taşındı.\n${failed > 0 ? `❌ **${failed} kişi** taşınamadı.` : ''}`
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

            await question.edit({
                content: 'Süre dolduğu için işlem iptal edildi.',
                embeds: [],
                components: []
            }).catch(() => null);
        });
    }
};
