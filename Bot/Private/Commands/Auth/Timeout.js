const { PermissionsBitField: { Flags }, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ComponentType, inlineCode, bold } = require('discord.js');
const ms = require('ms');
const Punishment = require('../../../Schema/Punishment');
const PunishmentCounter = require('../../../Schema/PunishmentCounter');
const { sendTimeoutLog } = require('../../../Base/TimeoutLog');
const timeouts = {
    '5m': 1000 * 60 * 5,
    '10m': 1000 * 60 * 10,
    '15m': 1000 * 60 * 15,
    '45m': 1000 * 60 * 45,
    '1h': 1000 * 60 * 60,
    '3d': 1000 * 60 * 60 * 24 * 3,
    '7d': 1000 * 60 * 60 * 24 * 7,
    '14d': 1000 * 60 * 60 * 24 * 14
};

module.exports = {
    name: 'mute',
    aliases: ['timeout'],
    category: 'Auth',

    execute: async (client, message, args, wency, embed) => {
        if (!message.member.permissions.has(Flags.Administrator) && !wency.timeOutAuth.some(x => message.member.roles.cache.has(x)))
            return message.reply({ content: 'Yetkin yok.' });

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member)
            return message.reply({ content: 'Bir kullanıcı belirtmelisin.' });

        if (member.id === message.author.id)
            return message.reply({ content: 'Kendine timeout atamazsın.' });
        if (message.member.roles?.highest.id === member.roles?.highest.id)
            return message.reply({ content: 'Kendi rolündeki kişiye timeout atamazsın.' });
        if (member.roles?.highest?.rawPosition >= message.member.roles?.highest?.rawPosition)
            return message.reply({ content: 'Yetkili olduğun kişiye timeout atamazsın.' });
        if (message.guild?.members.me?.roles.highest.id === member?.roles?.highest.id)
            return message.reply({ content: 'Botun rolündeki kişiye timeout atamazsın.' });

        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('timeout_duration')
                .setPlaceholder('Timeout süresi seç...')
                .addOptions([
                    { label: '5 Dakika', value: '5m', emoji: '🕔' },
                    { label: '10 Dakika', value: '10m', emoji: '🕙' },
                    { label: '15 Dakika', value: '15m', emoji: '⏱️' },
                    { label: '45 Dakika', value: '45m', emoji: '⌛' },
                    { label: '1 Saat', value: '1h', emoji: '⏰' },
                    { label: '3 Gün', value: '3d', emoji: '📆' },
                    { label: '7 Gün', value: '7d', emoji: '🗓️' },
                    { label: '14 Gün', value: '14d', emoji: '🧷' },
                ])
        );

        const question = await message.reply({
            components: [row],
        });

        const filter = (i) => i.user.id === message.author.id;
        const collector = question.createMessageComponentCollector({
            filter,
            time: 1000 * 60 * 5,
            componentType: ComponentType.StringSelect,
        });

        collector.on('collect', async i => {
            try {
                if (i.customId !== 'timeout_duration') return;
                const duration = timeouts[i.values[0]];
                if (!duration) return i.reply({ content: 'Geçersiz süre seçimi.', flags: 64 }).catch(() => null);

                await member.timeout(duration, `.mute | Yetkili: ${message.author.tag} (${message.author.id}) | Sebep: ${reason}`);
                const counter = await PunishmentCounter.findOneAndUpdate(
                    { guildId: message.guild.id },
                    { $inc: { caseId: 1 } },
                    { new: true, upsert: true, setDefaultsOnInsert: true }
                );
                const caseId = counter.caseId;
                await Punishment.create({
                    guildId: message.guild.id,
                    caseId,
                    userId: member.id,
                    moderatorId: message.author.id,
                    type: 'timeout',
                    reason,
                    duration,
                    expiresAt: new Date(Date.now() + duration),
                });

                await i.update({
                    embeds: [
                        embed.setDescription(
                            `${member} kullanıcısı başarıyla ${bold(ms(duration))} süresince susturuldu. (Ceza Numarası: #${caseId})`
                        ),
                    ],
                    components: [],
                }).catch(() => null);

                await sendTimeoutLog(message.guild, member, message.author, {
                    source: 'Komut Üzeri (.mute)',
                    duration,
                    reason,
                    caseId,
                    expiresAt: new Date(Date.now() + duration),
                });

                collector.stop('done');
            } catch (error) {
                console.error('[TIMEOUT_SELECT]', error);
                if (!i.replied && !i.deferred) {
                    await i.reply({ content: 'Timeout işlemi sırasında bir hata oluştu.', flags: 64 }).catch(() => null);
                }
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                question.edit({
                    embeds: null,
                    content: `${inlineCode(`5 dakika boyunca kullanıcının yanıt vermemesi nedeniyle işlem iptal edildi.`)}`,
                })
            }
        })
    }
}
