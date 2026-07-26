const {
    ContainerBuilder,
    MessageFlags,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
} = require('discord.js');

async function sendSecretRoomLog(guild, member, color, lines) {
    const logChannel = guild.channels.cache.find((channel) => channel.name?.trim().toLowerCase() === 'secret-log')
        || await findSecretLogChannel(guild);
    if (!logChannel?.isTextBased()) return;

    const actor = member?.user || member;
    const title = member?.displayName || actor?.username || 'Özel Oda';
    const avatar = actor?.displayAvatarURL?.({ extension: 'png', size: 1024 }) || guild.iconURL({ extension: 'png', size: 1024 });

    const container = new ContainerBuilder()
        .setAccentColor(color)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent([
                        `# ${title}`,
                        ...lines,
                        '',
                        '-# NOKTA',
                    ].join('\n'))
                )
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar))
        );

    return logChannel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [], users: [], roles: [] },
    }).catch(() => null);
}

async function findSecretLogChannel(guild) {
    await guild.channels.fetch().catch(() => null);
    return guild.channels.cache.find((channel) => channel.name?.trim().toLowerCase() === 'secret-log');
}

module.exports = { sendSecretRoomLog };
