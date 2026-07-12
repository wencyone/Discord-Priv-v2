const { PermissionsBitField: { Flags }, EmbedBuilder } = require('discord.js');
const Punishment = require('../../../Schema/Punishment');

module.exports = {
    name: 'jailbilgi',
    aliases: ['jailinfo'],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        if (!message.member.permissions.has(Flags.Administrator) && !wency?.banAuth?.some((roleId) => message.member.roles.cache.has(roleId))) {
            return message.reply({ content: 'Yetkin yok.' });
        }

        const targetId = (args[0] || '').replace(/[<@!>]/g, '').trim();
        if (!/^\d{16,20}$/.test(targetId)) return message.reply({ content: 'Geçerli bir kullanıcı belirtmelisin.' });

        const punishment = await Punishment.findOne({ guildId: message.guild.id, userId: targetId, type: 'jail', active: true }).sort({ caseId: -1 }).lean();
        const user = await client.users.fetch(targetId).catch(() => null);
        if (!punishment) {
            return message.reply({ embeds: [new EmbedBuilder().setTitle('Jail Bilgisi').setColor(0x2f3136).setDescription(`• Durum: Jailde Değil\n\n• Kullanıcı: ${user ? `${user} (${user.id})` : targetId}`)] });
        }

        const moderator = await client.users.fetch(punishment.moderatorId).catch(() => null);
        const embed = new EmbedBuilder()
            .setTitle('Jail Bilgisi')
            .setColor(0x2f3136)
            .setDescription([
                '• Durum: Jailde',
                '',
                `• Kullanıcı: ${user ? `${user} (${user.id})` : targetId}`,
                `• Ceza No: #${punishment.caseId}`,
                `• Yetkili: ${moderator ? `${moderator} (${moderator.id})` : punishment.moderatorId}`,
                `• Sebep: ${punishment.reason}`,
                `• Tarih: ${new Date(punishment.createdAt).toLocaleString('tr-TR')}`,
                `• Bitiş: ${punishment.expiresAt ? new Date(punishment.expiresAt).toLocaleString('tr-TR') : 'Kalıcı'}`
            ].join('\n'))
            .setTimestamp(punishment.createdAt);
        if (user) embed.setThumbnail(user.displayAvatarURL({ extension: 'png', size: 4096 }));
        return message.reply({ embeds: [embed] });
    }
};
