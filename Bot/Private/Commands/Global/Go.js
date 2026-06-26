const {
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    inlineCode
} = require('discord.js');

const PROTECTED_CHANNEL_ID = "YT ROLUNDEKI KISILERIN DAHI GIREMICEGI KANAL ID";
const PROTECTED_ROLE_ID = "SADECE SECILEN KANALA GIREBILCEK ROL ID "; //eklenen kanalda biri var ise .git .cek ile girebilme icin buralarida doldur
 
function grantVoiceProtectPass(memberId, channelId) {
    if (!global.voiceProtectPendingMoves) global.voiceProtectPendingMoves = new Map();
    global.voiceProtectPendingMoves.set(`${memberId}:${channelId}`, Date.now() + 1000 * 10);
}

module.exports = {
    name: 'git',
    aliases: ['go'],
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
                .setEmoji('1054856853814788216'),

            new ButtonBuilder()
                .setCustomId('cancel')
                .setLabel('Reddet')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('1057679211021746186')
        );

        const question = await message.reply({
            content: `${member}`,
            embeds: [
                new EmbedBuilder().setDescription(
                    `${message.member} bulunduğunuz ses kanalına gelmek istiyor. Kabul ediyor musunuz?`
                ),
            ],
            components: [row],
        });

        // SADECE HEDEF KULLANICI BUTONA BASABİLİR
        const filter = (i) => i.user.id === member.id;

        const collector = question.createMessageComponentCollector({
            filter,
            time: 1000 * 60 * 5,
            componentType: ComponentType.Button,
        });

        collector.on('collect', async (i) => {

            if (i.customId === 'accept') {

                // KOMUTU KULLANAN KİŞİYİ HEDEFİN KANALINA TAŞIR
                if (member.voice.channel.id === PROTECTED_CHANNEL_ID && member.roles.cache.has(PROTECTED_ROLE_ID)) {
                    grantVoiceProtectPass(message.member.id, member.voice.channel.id);
                }

                await message.member.voice.setChannel(member.voice.channel.id);

                await i.update({
                    embeds: [
                        new EmbedBuilder().setDescription(
                            `Başarıyla ${member} adlı kullanıcının odasına gidildi.`
                        ),
                    ],
                    components: [],
                });

            } else if (i.customId === 'cancel') {

                await i.update({
                    embeds: [
                        new EmbedBuilder().setDescription(
                            `${member} adlı kullanıcı isteği reddetti.`
                        ),
                    ],
                    components: [],
                });

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

            }

        });

    },
};
