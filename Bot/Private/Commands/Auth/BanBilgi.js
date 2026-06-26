const { AuditLogEvent, EmbedBuilder, PermissionsBitField: { Flags } } = require('discord.js');
const Punishment = require('../../../Schema/Punishment');

module.exports = {
    name: 'banbilgi',
    aliases: ['baninfo'],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        try {
            if (!message.member.permissions.has(Flags.Administrator) && !wency?.banAuth?.some((x) => message.member.roles.cache.has(x))) {
                return message.reply({ content: 'Yetkin yok.' });
            }

            const targetId = (args[0] || '').replace(/[<@!>]/g, '').trim();
            if (!targetId) return message.reply({ content: 'Bir kullanıcı ID belirtmelisin.' });
            if (!/^\d{16,20}$/.test(targetId)) return message.reply({ content: 'Geçerli bir kullanıcı ID belirtmelisin.' });

            const ban = await message.guild.bans.fetch(targetId).catch(() => null);
            const user = ban?.user || await client.users.fetch(targetId).catch(() => null);

            if (!ban) {
                const embed = new EmbedBuilder()
                    .setTitle('Ban Bilgisi')
                    .setColor(0x2f3136)
                    .setDescription([
                        '• Durum: Banlı Değil',
                        '',
                        `• Kullanıcı: ${user ? `${user} (${user.id})` : targetId}`,
                    ].join('\n'));

                if (user) embed.setThumbnail(user.displayAvatarURL({ extension: 'png', size: 4096 }));
                return message.reply({ embeds: [embed] });
            }

            const audits = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 100 }).catch(() => null);
            const audit = audits?.entries?.find((entry) => entry.target?.id === targetId);
            const record = await Punishment.findOne({
                guildId: message.guild.id,
                userId: targetId,
                type: 'ban',
                active: true
            }).sort({ caseId: -1 }).lean().catch(() => null);
            const createdAt = audit?.createdTimestamp ? new Date(audit.createdTimestamp) : null;
            const recordDate = record?.createdAt ? new Date(record.createdAt) : null;
            const moderator = record?.moderatorId ? await client.users.fetch(record.moderatorId).catch(() => null) : null;
            const executor = moderator || audit?.executor || null;
            const reason = record?.reason || ban.reason || audit?.reason || 'Sağ-Tık';

            const embed = new EmbedBuilder()
                .setTitle('Ban Bilgisi')
                .setColor(0x2f3136)
                .setDescription([
                    '• Durum: Banlı',
                    '',
                    `• Kullanıcı: ${user ? `${user} (${user.id})` : targetId}`,
                    `• Ceza No: ${record?.caseId ? `#${record.caseId}` : audit?.id ? `#${audit.id}` : 'Bulunamadı'}`,
                    '• Tür: Yasaklama',
                    `• Yetkili: ${executor ? `${executor} (${executor.id})` : 'Bulunamadı'}`,
                    `• Sebep: ${reason}`,
                    `• Tarih: ${recordDate ? recordDate.toLocaleString('tr-TR') : createdAt ? createdAt.toLocaleString('tr-TR') : 'Bulunamadı'}`,
                ].join('\n'));

            if (user) embed.setThumbnail(user.displayAvatarURL({ extension: 'png', size: 4096 }));
            if (recordDate || createdAt) embed.setTimestamp(recordDate || createdAt);
            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[BANBILGI_COMMAND]', error);
            return message.reply({ content: 'Ban bilgisi alınırken bir hata oluştu.' }).catch(() => null);
        }
    }
};
