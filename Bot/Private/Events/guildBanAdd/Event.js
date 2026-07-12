const { AuditLogEvent, EmbedBuilder, Events } = require('discord.js');

client.on(Events.GuildBanAdd, async (ban) => {
    const entry = await ban.guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberBanAdd })
        .then((audit) => audit.entries.find((item) => item.targetId === ban.user.id && Date.now() - item.createdTimestamp < 10000))
        .catch(() => null);

    if (!entry?.executor || entry.executor.id === client.user.id) return;

    const channel = ban.guild.channels.cache.find((item) => item.name === 'ban-log');
    if (!channel?.isTextBased()) return;

    const embed = new EmbedBuilder()
        .setTitle('Kullanıcı Sağ Tık Banlandı')
        .setColor(0xed4245)
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
