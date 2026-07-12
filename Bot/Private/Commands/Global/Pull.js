const {
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    inlineCode
} = require('discord.js');

const PROTECTED_CHANNEL_ID = "1519790216901169323";
const PROTECTED_ROLE_ID = "1475248069875466337";
const SUCCESS_EMOJI = '1054856853814788216';
const CANCEL_EMOJI = '1057679211021746186';

function grantVoiceProtectPass(memberId, channelId) {
    if (!global.voiceProtectPendingMoves) global.voiceProtectPendingMoves = new Map();
    global.voiceProtectPendingMoves.set(`${memberId}:${channelId}`, Date.now() + 1000 * 10);
}

async function grantPrivateRoomAccess(channel, ownerId, memberId, settings) {
    const room = (settings?.privateRooms || []).find((item) => item.channel === channel?.id && item.owner === ownerId);
    if (!room) return;

    await channel.permissionOverwrites.edit(memberId, {
        [PermissionsBitField.Flags.Connect]: true,
        [PermissionsBitField.Flags.ViewChannel]: true,
    }).catch(() => null);
}

async function reactResult(message, emojiId, fallback) {
    await message.react(emojiId).catch(() => message.react(fallback).catch(() => null));
}

function deleteLater(message, delay = 5000) {
    setTimeout(() => message.delete().catch(() => null), delay);
}

module.exports = {
    name: 'çek',
    aliases: ['pull','çek','cek'],
    category: 'General',

    execute: async (client, message, args, wency, embed) => {

        const channel = message.guild.channels.cache.get(wency.botCommandChannel);

        if (
            message.channel.name !== channel?.name &&
            !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
        ) {
            return message.reply({
                content: `Bu komut sadece ${channel} kanalında kullanılabilir.`,
            });
        }

        if (!message.member.voice.channel) {
            return message.reply({
                content: 'Bir ses kanalında olmalısınız!',
            });
        }

        const member =
            message.mentions.members.first() ||
            message.guild.members.cache.get(args[0]);

        if (!member) {
            return message.reply({
                content: 'Kullanıcı bulunamadı!',
            });
        }

        if (member.id === message.author.id) {
            return message.reply({
                content: 'Bu zaten sensin!',
            });
        }

        if (!member.voice.channel) {
            return message.reply({
                content: 'Kullanıcı bir ses kanalında değil!',
            });
        }

        if (member.voice.channel.id === message.member.voice.channel.id) {
            return message.reply({
                content: 'Kullanıcı zaten aynı kanalda!',
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('accept')
                .setLabel('Onayla')
                .setStyle(ButtonStyle.Success)
                .setEmoji(SUCCESS_EMOJI),

            new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('Reddet')
                .setStyle(ButtonStyle.Danger)
                .setEmoji(CANCEL_EMOJI)
        );

        const question = await message.reply({
            content: `${member}`,
            embeds: [
                new EmbedBuilder().setDescription(
                    `${message.member} sizi bulunduğu ses kanalına çekmek istiyor. Kabul ediyor musunuz?`
                ),
            ],
            components: [row],
        });

        // SADECE HEDEF KULLANICI BUTONLARA BASABİLİR
        const filter = (i) => i.user.id === member.id;

        const collector = question.createMessageComponentCollector({
            filter,
            time: 1000 * 60 * 5,
            componentType: ComponentType.Button,
        });

        collector.on('collect', async (i) => {

            if (i.customId === 'accept') {

                // HEDEF KULLANICIYI KOMUTU KULLANANIN KANALINA ÇEKER
                if (message.member.voice.channel.id === PROTECTED_CHANNEL_ID && message.member.roles.cache.has(PROTECTED_ROLE_ID)) {
                    grantVoiceProtectPass(member.id, message.member.voice.channel.id);
                }

                await grantPrivateRoomAccess(message.member.voice.channel, message.member.id, member.id, wency);
                await member.voice.setChannel(message.member.voice.channel.id);
                await reactResult(message, SUCCESS_EMOJI, '✅');

                await i.update({
                    embeds: [
                        new EmbedBuilder().setDescription(
                            `${member}, ${message.member} kullanıcısının kanalına başarıyla taşındı.`
                        ),
                    ],
                    components: [],
                });
                deleteLater(question);

            } else if (i.customId === 'cancel') {
                await reactResult(message, CANCEL_EMOJI, '❌');

                await i.update({
                    embeds: [
                        new EmbedBuilder().setDescription(
                            `${member}, ${message.member} kullanıcısının isteğini reddetti.`
                        ),
                    ],
                    components: [],
                });
                deleteLater(question);

            }

        });

        collector.on('end', async (_, reason) => {

            if (reason === 'time') {

                await question.edit({
                    embeds: [],
                    components: [],
                    content: inlineCode(
                        '5 dakika boyunca yanıt verilmediği için işlem iptal edildi.'
                    ),
                });
                await reactResult(message, CANCEL_EMOJI, '❌');
                deleteLater(question);

            }

        });

    },
};
