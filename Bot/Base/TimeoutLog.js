const {
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
} = require('discord.js');

async function sendTimeoutLog(guild, member, moderator, options) {
    const channel = guild.channels.cache.find((item) => item.name === 'mute-log');
    if (!channel?.isTextBased()) return;

    const fields = [
        '# 🔇 Kullanıcı Susturuldu',
        `${member} kullanıcısına **timeout uygulandı**`,
        '',
        `**İşlem Türü:** ${options.source}`,
        `**Yetkili:** <@${moderator.id}>`,
        `**Süre:** ${formatDuration(options.duration)}`,
        `**Sebep:** ${options.reason || 'Sebep belirtilmedi'}`,
    ];

    if (options.caseId) fields.push(`**Ceza Numarası:** #${options.caseId}`);
    if (options.expiresAt) fields.push(`**Bitiş:** <t:${Math.floor(options.expiresAt.getTime() / 1000)}:F>`);
    fields.push('', `**ID:** ${member.id} • <t:${Math.floor(Date.now() / 1000)}:F>`);

    const container = new ContainerBuilder()
        .setAccentColor(0xed4245)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(fields.join('\n')))
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(member.user.displayAvatarURL({ extension: 'png', size: 1024 }))
                )
        );

    await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [] },
    }).catch(() => null);
}

function formatDuration(duration) {
    const totalMinutes = Math.max(1, Math.ceil(duration / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    return [
        days ? `${days} gün` : null,
        hours ? `${hours} saat` : null,
        minutes ? `${minutes} dakika` : null,
    ].filter(Boolean).join(' ');
}

module.exports = { sendTimeoutLog };
