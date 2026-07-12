const { AuditLogEvent, EmbedBuilder, Events } = require('discord.js');

client.on(Events.GuildBanRemove, async (ban) => {
    const entry = await ban.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberBanRemove })
        .then((audit) => audit.entries.find((item) => item.targetId === ban.user.id && Date.now() - item.createdTimestamp < 10000))
        .catch(() => null);

    if (!entry?.executor || entry.executor.id === client.user.id) return;

    const channel = ban.guild.channels.cache.find((item) => item.name === 'ban-log');
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
        .setTitle('Kullanıcı Banı Kaldırıldı')
        .setColor(0x57f287)
        .setThumbnail(ban.user.displayAvatarURL({ extension: 'png', size: 1024 }))
        .addFields(
            { name: 'Kullanıcı', value: `${ban.user} (\`${ban.user.id}\`)` },
            { name: 'Yetkili', value: `${entry.executor} (\`${entry.executor.id}\`)`, inline: true },
            { name: 'Sebep', value: entry.reason || 'Sebep belirtilmedi', inline: true },
            { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
        )
        .setTimestamp();

    await channel.send({ embeds: [embed], allowedMentions: { parse: [], users: [], roles: [] } }).catch(() => null);
});
