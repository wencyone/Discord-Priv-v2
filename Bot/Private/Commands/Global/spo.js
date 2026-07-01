const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    MessageFlags,
    PermissionsBitField,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
} = require('discord.js');

function formatTime(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function createProgressBar(progress) {
    const size = 24;
    const active = Math.round(Math.max(0, Math.min(progress, 1)) * size);
    return `${'▰'.repeat(active)}${'▱'.repeat(size - active)}`;
}

function spotifySearch(query) {
    return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

module.exports = {
    name: 'spo',
    aliases: ['spotify', 'sarki', 'şarkı'],
    category: 'General',

    execute: async (client, message, args, wency) => {
        const channel = message.guild.channels.cache.get(wency.botCommandChannel);

        if (
            message.channel.name !== channel?.name &&
            !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
        ) {
            return message.reply({ content: `Bu komut sadece ${channel} kanalında kullanılabilir.` });
        }

        const member = message.mentions.members.first()
            || message.guild.members.cache.get(args[0])
            || message.member;
        const spotify = member.presence?.activities?.find((activity) => activity.name === 'Spotify');

        if (!spotify) {
            return message.reply({ content: `${member} şu anda Spotify’da bir şarkı dinlemiyor.` });
        }

        const song = spotify.details || 'Bilinmeyen Şarkı';
        const artist = spotify.state || 'Bilinmeyen Sanatçı';
        const album = spotify.assets?.largeText || spotify.album || 'Bilinmeyen Albüm';
        const start = spotify.timestamps?.start || Date.now();
        const end = spotify.timestamps?.end || start + 1;
        const total = Math.max(1, end - start);
        const current = Math.max(0, Math.min(Date.now() - start, total));
        const progress = current / total;
        const cover = spotify.assets?.largeImageURL?.({ size: 1024 })
            || member.user.displayAvatarURL({ extension: 'png', size: 1024 });
        const trackUrl = spotify.syncId
            ? `https://open.spotify.com/track/${spotify.syncId}`
            : spotifySearch(`${song} ${artist}`);

        const information = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent([
                    '### 🟢 ŞU ANDA ÇALIYOR',
                    `# ${song}`,
                    `## ${artist}`,
                    album,
                    '',
                    `🟢 **Dinleyen:** ${member}`,
                ].join('\n'))
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(cover));

        const progressText = new TextDisplayBuilder().setContent([
            createProgressBar(progress),
            `\`${formatTime(current)}\` ────────────────────   \`${formatTime(total)}\``,
        ].join('\n'));

        const links = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Dinle').setEmoji('🎧').setStyle(ButtonStyle.Link).setURL(trackUrl),
            new ButtonBuilder().setLabel('Albüm').setEmoji('💿').setStyle(ButtonStyle.Link).setURL(spotifySearch(`${album} ${artist}`)),
            new ButtonBuilder().setLabel('Sanatçı').setEmoji('🎤').setStyle(ButtonStyle.Link).setURL(spotifySearch(artist)),
        );

        const container = new ContainerBuilder()
            .setAccentColor(0x1db954)
            .addSectionComponents(information)
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
            .addTextDisplayComponents(progressText)
            .addActionRowComponents(links);

        return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
            allowedMentions: { parse: [], users: [], roles: [] },
        });
    },
};
