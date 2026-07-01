const { PermissionsBitField: { Flags }, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, EmbedBuilder } = require('discord.js');
const Punishment = require('../../../Schema/Punishment');
const PunishmentCounter = require('../../../Schema/PunishmentCounter');

module.exports = {
    name: 'jail',
    aliases: [],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!message.member.permissions.has(Flags.Administrator) && !wency?.banAuth?.some((roleId) => message.member.roles.cache.has(roleId))) {
            return message.reply({ content: 'Yetkin yok.' });
        }

        if (!wency.jailRole) return message.reply({ content: 'Jail rolü ayarlanmamış. `.kur` menüsünden Jail Rolü seçilmeli.' });
        const jailRole = message.guild.roles.cache.get(wency.jailRole);
        if (!jailRole) return message.reply({ content: 'Ayarlı jail rolü sunucuda bulunamadı.' });
        if (jailRole.position >= message.guild.members.me.roles.highest.position) return message.reply({ content: 'Jail rolü botun en yüksek rolünden aşağıda olmalı.' });

        const member = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
        if (!member) return message.reply({ content: 'Bir kullanıcı belirtmelisin.' });
        if (member.id === message.author.id) return message.reply({ content: 'Kendine jail atamazsın.' });
        if (member.id === message.guild.ownerId) return message.reply({ content: 'Sunucu sahibine jail atamazsın.' });
        if (member.roles.highest.position >= message.member.roles.highest.position) return message.reply({ content: 'Yetkisi senden yüksek veya aynı seviyedeki kullanıcıya jail atamazsın.' });
        if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) return message.reply({ content: 'Bu kullanıcının rolü botun rolünden yüksek.' });

        const activeJail = await Punishment.exists({ guildId: message.guild.id, userId: member.id, type: 'jail', active: true });
        if (activeJail) return message.reply({ content: 'Bu kullanıcı zaten jailde.' });

        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';
        const options = Array.from({ length: 14 }, (_, index) => ({
            label: `${index + 1} Gün`,
            value: String(index + 1),
            emoji: '📅'
        }));
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('jail_duration').setPlaceholder('Jail süresini seç...').addOptions(options)
        );
        const question = await message.reply({ content: `${member} için 1-14 gün arası jail süresi seç.`, components: [row] });
        const collector = question.createMessageComponentCollector({
            filter: (interaction) => interaction.user.id === message.author.id,
            componentType: ComponentType.StringSelect,
            time: 1000 * 60 * 5,
            max: 1
        });

        collector.on('collect', async (interaction) => {
            try {
                const days = Number(interaction.values[0]);
                if (!Number.isInteger(days) || days < 1 || days > 14) return interaction.reply({ content: 'Geçersiz süre.', flags: 64 });

                const previousRoles = member.roles.cache
                    .filter((role) => role.id !== message.guild.id && !role.managed && role.id !== jailRole.id)
                    .map((role) => role.id);
                const duration = days * 24 * 60 * 60 * 1000;
                const counter = await PunishmentCounter.findOneAndUpdate(
                    { guildId: message.guild.id },
                    { $inc: { caseId: 1 } },
                    { new: true, upsert: true, setDefaultsOnInsert: true }
                );
                const punishment = await Punishment.create({
                    guildId: message.guild.id,
                    caseId: counter.caseId,
                    userId: member.id,
                    moderatorId: message.author.id,
                    type: 'jail',
                    reason,
                    duration,
                    expiresAt: new Date(Date.now() + duration),
                    previousRoles
                });

                try {
                    await member.roles.set([jailRole.id], `.jail | Yetkili: ${message.author.tag} (${message.author.id}) | Sebep: ${reason}`);
                } catch (error) {
                    punishment.active = false;
                    await punishment.save().catch(() => null);
                    throw error;
                }

                await interaction.update({ content: `${member} kullanıcısı ${days} gün jail'e atıldı. (Ceza Numarası: #${punishment.caseId})`, components: [] });
                const logChannel = message.guild.channels.cache.find((channel) => channel.name === 'jail-log');
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle('Kullanıcı Jail Edildi')
                        .setColor(0xed4245)
                        .addFields(
                            { name: 'Kullanıcı', value: `${member} (\`${member.id}\`)` },
                            { name: 'Ceza Numarası', value: `#${punishment.caseId}`, inline: true },
                            { name: 'Yetkili', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                            { name: 'Süre', value: `${days} gün`, inline: true },
                            { name: 'Sebep', value: reason },
                            { name: 'Bitiş', value: `<t:${Math.floor(punishment.expiresAt.getTime() / 1000)}:F>` }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] }).catch(() => null);
                }
            } catch (error) {
                console.error('[JAIL_COMMAND]', error);
                if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'Jail işlemi sırasında bir hata oluştu.', flags: 64 }).catch(() => null);
            }
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') question.edit({ content: 'Süre seçilmediği için jail işlemi iptal edildi.', components: [] }).catch(() => null);
        });
    }
};
