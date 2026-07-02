const { PermissionsBitField: { Flags }, EmbedBuilder } = require('discord.js');
const Punishment = require('../../../Schema/Punishment');
const PunishmentCounter = require('../../../Schema/PunishmentCounter');

module.exports = {
    name: 'ban',
    aliases: ['ban', 'sg', 'yargı', 'yargi'],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        try {
            if (!message.member.permissions.has(Flags.Administrator) && !wency?.banAuth?.some(x => message.member.roles.cache.has(x))) {
                return message.reply('Bu komutu kullanmak için yetkin yok.');
            }

            if (!args[0]) {
                return message.reply('Bir kullanıcı belirtmelisin.');
            }

            const member = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);

            if (!member) {
                return message.reply('Geçerli bir kullanıcı belirtmelisin.');
            }

            if (member.id === message.author.id) {
                return message.reply('Kendini banlayamazsın.');
            }

            if (member.id === message.guild.ownerId) {
                return message.reply('Sunucu sahibini banlayamazsın.');
            }

            if (member.roles.highest.position >= message.member.roles.highest.position) {
                return message.reply('Bu kullanıcıyı banlayamazsın - yetkisi senden yüksek veya aynı seviyede.');
            }

            if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
                return message.reply('Bu kullanıcıyı banlayamam - yetkisi benden yüksek.');
            }

            const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

            await member.ban({ reason });
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
                type: 'ban',
                reason,
            });

            const logChannel = message.guild.channels.cache.find(x => x.name === 'ban-log');

            if (logChannel) {
                const banEmbed = new EmbedBuilder()
                    .setTitle('Kullanıcı Banlandı')
                    .setDescription(`${member} \`${member.user.tag}\` banlandı.`)
                    .addFields(
                        { name: 'Ceza Numarası', value: `#${caseId}`, inline: true },
                        { name: 'Banlayan', value: `${message.author} \`${message.author.tag}\``, inline: true },
                        { name: 'Sebep', value: reason, inline: true },
                        { name: 'Tarih', value: new Date().toLocaleString('tr-TR'), inline: true }
                    )
                    .setColor(0xff0000)
                    .setFooter({ text: 'Created By Wency' });

                await logChannel.send({
                    embeds: [banEmbed]
                });
            }

            return message.reply(`${member} \`${member.user.tag}\` başarıyla banlandı. Sebep: ${reason} (Ceza Numarası: #${caseId})`);

        } catch (error) {
            console.error('Ban error:', error);
            return message.reply('Kullanıcı banlanırken bir hata oluştu.');
        }
    }
};
