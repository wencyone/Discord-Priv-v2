const { hasOwnerRole } = require('../../../Base/OwnerRole');
const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Settings = require('../../../Schema/Settings');

module.exports = {
    name: 'kanaletiket',
    aliases: ['etiket-kur', 'join-mention'],
    category: 'Root',

    execute: async (client, message, args, wency) => {
        if (
            !hasOwnerRole(message.member, wency) &&
            !message.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
            return message.reply('Bu komutu kullanmak için yönetici olmalısın.');
        }

        const data = await Settings.findOne({ id: message.guild.id }) || {};
        const currentChannels = Array.isArray(data.mentionChannelIds) ? data.mentionChannelIds : [];

        const subCommand = args[0]?.toLowerCase();

        if (!subCommand) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Kanal Etiket Sistemi')
                        .setDescription(
                            [
                                '`kanaletiket liste`',
                                '`kanaletiket ekle #kanal`',
                                '`kanaletiket çıkar #kanal`',
                                '`kanaletiket sıfırla`',
                            ].join('\n')
                        )
                        .setColor(0x8b5cf6)
                ]
            });
        }

        if (subCommand === 'liste') {
            if (!currentChannels.length) {
                return message.reply('Şu anda kayıtlı kanal yok.');
            }

            const channelList = currentChannels
                .map((id, index) => {
                    const channel = message.guild.channels.cache.get(id);
                    return `${index + 1}. ${channel ? `<#${id}>` : `Silinmiş kanal: \`${id}\``}`;
                })
                .join('\n');

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Kayıtlı Kanal Etiket Kanalları')
                        .setDescription(channelList)
                        .setColor(0x8b5cf6)
                ]
            });
        }

        if (subCommand === 'ekle') {
            const mentioned = message.mentions.channels.map((channel) => channel.id);

            const typedIds = args.slice(1)
                .join(' ')
                .split(/[, ]+/)
                .map((id) => id.replace(/[<#>]/g, '').trim())
                .filter((id) => message.guild.channels.cache.has(id));

            const channelIds = [...new Set([...mentioned, ...typedIds])].filter((id) => {
                const channel = message.guild.channels.cache.get(id);
                return channel?.type === ChannelType.GuildText;
            });

            if (!channelIds.length) {
                return message.reply('Geçerli bir metin kanalı belirtmelisin.');
            }

            const updatedChannels = [...new Set([...currentChannels, ...channelIds])];

            await Settings.updateOne(
                { id: message.guild.id },
                {
                    $set: {
                        mentionChannelIds: updatedChannels
                    }
                },
                { upsert: true }
            );

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Kanal Eklendi')
                        .setDescription(
                            `Eklenen kanal/kanallar:\n${channelIds.map((id) => `<#${id}>`).join(', ')}`
                        )
                        .setColor(0x22c55e)
                ]
            });
        }

        if (['çıkar', 'cikar', 'sil', 'kaldır', 'kaldir'].includes(subCommand)) {
            const mentioned = message.mentions.channels.map((channel) => channel.id);

            const typedIds = args.slice(1)
                .join(' ')
                .split(/[, ]+/)
                .map((id) => id.replace(/[<#>]/g, '').trim())
                .filter(Boolean);

            const removeIds = [...new Set([...mentioned, ...typedIds])];

            if (!removeIds.length) {
                return message.reply('Listeden çıkarılacak kanalı belirtmelisin.');
            }

            const updatedChannels = currentChannels.filter((id) => !removeIds.includes(id));

            await Settings.updateOne(
                { id: message.guild.id },
                {
                    $set: {
                        mentionChannelIds: updatedChannels
                    }
                },
                { upsert: true }
            );

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Kanal Çıkarıldı')
                        .setDescription(
                            `Çıkarılan kanal/kanallar:\n${removeIds.map((id) => `<#${id}>`).join(', ')}`
                        )
                        .setColor(0xef4444)
                ]
            });
        }

        if (['sıfırla', 'sifirla', 'temizle'].includes(subCommand)) {
            await Settings.updateOne(
                { id: message.guild.id },
                {
                    $set: {
                        mentionChannelIds: []
                    }
                },
                { upsert: true }
            );

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('Liste Temizlendi')
                        .setDescription('Kanal etiket listesi tamamen sıfırlandı.')
                        .setColor(0xef4444)
                ]
            });
        }

        return message.reply('Geçersiz kullanım. `.kanaletiket liste`, `.kanaletiket ekle #kanal`, `.kanaletiket çıkar #kanal`');
    },
};