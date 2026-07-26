const { AuditLogEvent, EmbedBuilder, PermissionsBitField: { Flags } } = require('discord.js');
const Punishment = require('../../../Schema/Punishment');

module.exports = {
    name: 'mutebilgi',
    aliases: ['muteinfo', 'timeoutbilgi'],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        try {
            if (!message.member.permissions.has(Flags.Administrator) && !wency?.auth?.some((x) => message.member.roles.cache.has(x))) {
                return message.reply({ content: 'Yetkin yok.' });
            }

            const targetId = (args[0] || '').replace(/[<@!>]/g, '').trim();
            if (!targetId) return message.reply({ content: 'Bir kullanıcı belirtmelisin.' });
            if (!/^\d{16,20}$/.test(targetId)) return message.reply({ content: 'Geçerli bir kullanıcı ID belirtmelisin.' });

            const member = message.mentions.members.first() || await message.guild.members.fetch(targetId).catch(() => null);
            const user = member?.user || await client.users.fetch(targetId).catch(() => null);

            if (!member) {
                return message.reply({ content: 'Kullanıcı sunucuda bulunamadı.' });
            }

            const mutedUntil = member.communicationDisabledUntilTimestamp || 0;
            const isMuted = typeof member.isCommunicationDisabled === 'function'
                ? member.isCommunicationDisabled()
                : mutedUntil > Date.now();

            if (!isMuted) {
                const embed = new EmbedBuilder()
                    .setTitle('Mute Bilgisi')
                    .setColor(0x2f3136)
                    .setDescription([
                        '• Durum: Muteli Değil',
                        '',
                        `• Kullanıcı: ${user ? `${user} (${user.id})` : targetId}`,
                    ].join('\n'));

                if (user) embed.setThumbnail(user.displayAvatarURL({ extension: 'png', size: 4096 }));
                return message.reply({ embeds: [embed] });
            }

            const audits = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 100 }).catch(() => null);
            const audit = audits?.entries?.find((entry) => {
                if (entry.target?.id !== member.id) return false;
                return entry.changes?.some((change) => change.key === 'communication_disabled_until');
            });
            const record = await Punishment.findOne({
                guildId: message.guild.id,
                userId: member.id,
                type: 'timeout',
                active: true
            }).sort({ caseId: -1 }).lean().catch(() => null);
            const createdAt = audit?.createdTimestamp ? new Date(audit.createdTimestamp) : null;
            const recordDate = record?.createdAt ? new Date(record.createdAt) : null;
            const moderator = record?.moderatorId ? await client.users.fetch(record.moderatorId).catch(() => null) : null;
            const executor = moderator || audit?.executor || null;
            const isBotMute = Boolean(record) || audit?.executor?.id === client.user.id;
            const reason = record?.reason || audit?.reason || (isBotMute ? 'Bot Üzeri Atıldı' : 'Sağ-Tık');
            const type = isBotMute ? 'Bot Üzeri Timeout' : 'Sağ-Tık Timeout';
            const endDate = record?.expiresAt ? new Date(record.expiresAt) : new Date(mutedUntil);

            const embed = new EmbedBuilder()
                .setTitle('Mute Bilgisi')
                .setColor(0x2f3136)
                .setDescription([
                    '• Durum: Muteli',
                    '',
                    `• Kullanıcı: ${user ? `${user} (${user.id})` : targetId}`,
                    `• Ceza No: ${record?.caseId ? `#${record.caseId}` : audit?.id ? `#${audit.id}` : 'Bulunamadı'}`,
                    `• Tür: ${type}`,
                    `• Yetkili: ${executor ? `${executor} (${executor.id})` : 'Bulunamadı'}`,
                    `• Sebep: ${reason}`,
                    `• Tarih: ${recordDate ? recordDate.toLocaleString('tr-TR') : createdAt ? createdAt.toLocaleString('tr-TR') : 'Bulunamadı'}`,
                    `• Bitiş: ${endDate.toLocaleString('tr-TR')}`,
                ].join('\n'));

            if (user) embed.setThumbnail(user.displayAvatarURL({ extension: 'png', size: 4096 }));
            if (recordDate || createdAt) embed.setTimestamp(recordDate || createdAt);
            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[MUTEBILGI_COMMAND]', error);
            return message.reply({ content: 'Mute bilgisi alınırken bir hata oluştu.' }).catch(() => null);
        }
    }
};
