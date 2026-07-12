const {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
} = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

function formatTime(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function spotifySearch(query) {
    return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

function lyricsSearch(song, artist) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${song} ${artist} lyrics`)}`;
}

function cleanText(text, fallback) {
    return String(text || fallback).replace(/\s+/g, ' ').trim();
}

function truncate(ctx, text, maxWidth) {
    const value = String(text);
    if (ctx.measureText(value).width <= maxWidth) return value;

    let output = value;
    while (output.length > 0 && ctx.measureText(`${output}...`).width > maxWidth) {
        output = output.slice(0, -1);
    }

    return `${output.trim()}...`;
}

function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

function drawRoundedImage(ctx, image, x, y, width, height, radius) {
    ctx.save();
    roundRect(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
}

function drawCenteredText(ctx, text, x, y, width, height, font, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncate(ctx, text, width - 24), x + (width / 2), y + (height / 2));
    ctx.restore();
}

function drawCoverBackground(ctx, image, width, height) {
    if (!image) {
        const fallback = ctx.createLinearGradient(0, 0, width, height);
        fallback.addColorStop(0, '#342818');
        fallback.addColorStop(0.5, '#241811');
        fallback.addColorStop(1, '#111111');
        ctx.fillStyle = fallback;
        ctx.fillRect(0, 0, width, height);
        return;
    }

    const scale = Math.max(width / image.width, height / image.height);
    const bgW = image.width * scale;
    const bgH = image.height * scale;
    const bgX = (width - bgW) / 2;
    const bgY = (height - bgH) / 2;

    ctx.drawImage(image, bgX, bgY, bgW, bgH);

    ctx.fillStyle = 'rgba(18, 14, 10, 0.78)';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(38, 31, 22, 0.62)');
    gradient.addColorStop(0.5, 'rgba(42, 26, 18, 0.70)');
    gradient.addColorStop(1, 'rgba(18, 18, 18, 0.84)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

async function createSpotifyCard(member, spotify, coverURL) {
    const width = 1100;
    const height = 480;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    let cover;
    try {
        cover = await loadImage(coverURL);
    } catch {
        cover = null;
    }

    const song = cleanText(spotify.details, 'Bilinmeyen Sarki');
    const artist = cleanText(spotify.state, 'Bilinmeyen Sanatci');
    const album = cleanText(spotify.assets?.largeText || spotify.album, 'Bilinmeyen Album');
    const start = spotify.timestamps?.start || Date.now();
    const end = spotify.timestamps?.end || start + 1;
    const total = Math.max(1, end - start);
    const current = Math.max(0, Math.min(Date.now() - start, total));
    const progress = current / total;

    drawCoverBackground(ctx, cover, width, height);

    ctx.save();
    roundRect(ctx, 0, 0, width, height, 16);
    ctx.clip();

    if (cover) {
        drawRoundedImage(ctx, cover, 28, 100, 280, 280, 10);
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
        roundRect(ctx, 28, 100, 280, 280, 10);
        ctx.fill();
        ctx.fillStyle = '#1ed760';
        ctx.font = 'bold 64px Sans';
        ctx.textAlign = 'center';
        ctx.fillText('SP', 168, 255);
        ctx.textAlign = 'left';
    }

    ctx.fillStyle = 'rgba(0, 180, 62, 0.16)';
    roundRect(ctx, 340, 42, 230, 42, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30, 215, 96, 0.70)';
    ctx.lineWidth = 2;
    ctx.stroke();

    drawCenteredText(ctx, 'SU ANDA CALIYOR', 340, 42, 230, 42, 'bold 18px Sans', '#1ed760');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    roundRect(ctx, 860, 42, 210, 42, 21);
    ctx.fill();

    drawCenteredText(ctx, `Dinleyen: ${member.displayName}`, 860, 42, 210, 42, '18px Sans', '#d9d9d9');

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Sans';
    ctx.fillText(truncate(ctx, song, 680), 340, 135);

    ctx.fillStyle = '#d8d8d8';
    ctx.font = '24px Sans';
    ctx.fillText(truncate(ctx, artist, 680), 340, 174);

    ctx.fillStyle = '#bdbdbd';
    ctx.font = '19px Sans';
    ctx.fillText(truncate(ctx, album, 680), 340, 205);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    roundRect(ctx, 340, 232, 730, 8, 4);
    ctx.fill();

    ctx.fillStyle = '#1ed760';
    roundRect(ctx, 340, 232, Math.max(10, 730 * progress), 8, 4);
    ctx.fill();

    ctx.fillStyle = '#d8d8d8';
    ctx.font = '18px Sans';
    ctx.fillText(formatTime(current), 340, 270);
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(total), 1070, 270);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(10, 10, 10, 0.62)';
    roundRect(ctx, 340, 286, 730, 176, 12);
    ctx.fill();

    ctx.fillStyle = '#e5e5e5';
    ctx.font = 'bold 18px Sans';
    ctx.fillText('Benzer Sarki Onerileri', 360, 318);

    const suggestions = [
        { title: song, subtitle: artist },
        { title: `${artist} populer`, subtitle: 'Spotify' },
        { title: album, subtitle: artist },
    ];

    suggestions.forEach((suggestion, index) => {
        const y = 350 + (index * 40);
        ctx.fillStyle = '#d8d8d8';
        ctx.font = '20px Sans';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${index + 1}.`, 370, y);

        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Sans';
        ctx.fillText(truncate(ctx, suggestion.title, 430), 420, y - 8);

        ctx.fillStyle = '#b8b8b8';
        ctx.font = '14px Sans';
        ctx.fillText(truncate(ctx, suggestion.subtitle, 430), 420, y + 12);

        ctx.fillStyle = '#cfcfcf';
        ctx.font = '16px Sans';
        ctx.textAlign = 'right';
        ctx.fillText('Spotify', 1046, y);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    });

    ctx.restore();

    return canvas.toBuffer('image/png');
}

async function getMember(message, args) {
    const userId = args[0]?.replace(/[<@!>]/g, '');
    return message.mentions.members.first()
        || (userId ? await message.guild.members.fetch({ user: userId, withPresences: true }).catch(() => null) : null)
        || message.member;
}

module.exports = {
    name: 'spo',
    aliases: ['spotify', 'sarki', 'şarkı'],
    category: 'General',

    execute: async (client, message, args, wency) => {
        const channel = message.guild.channels.cache.get(wency.botCommandChannel);

        if (
            channel &&
            message.channel.id !== channel.id &&
            !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
        ) {
            return message.reply({ content: `Bu komut sadece ${channel} kanalında kullanılabilir.` });
        }

        const member = await getMember(message, args);
        if (!member) return message.reply({ content: 'Kullanıcı bulunamadı.' });

        const presence = member.presence || message.guild.presences.cache.get(member.id);
        const spotify = presence?.activities?.find((activity) => activity.name === 'Spotify');

        if (!spotify) {
            return message.reply({ content: `${member} şu anda Spotify’da bir şarkı dinlemiyor.` });
        }

        const song = cleanText(spotify.details, 'Bilinmeyen Sarki');
        const artist = cleanText(spotify.state, 'Bilinmeyen Sanatci');
        const album = cleanText(spotify.assets?.largeText || spotify.album, 'Bilinmeyen Album');
        const cover = spotify.assets?.largeImageURL?.({ size: 1024 })
            || member.user.displayAvatarURL({ extension: 'png', size: 1024 });
        const trackUrl = spotify.syncId
            ? `https://open.spotify.com/track/${spotify.syncId}`
            : spotifySearch(`${song} ${artist}`);

        const buffer = await createSpotifyCard(member, spotify, cover);
        const file = new AttachmentBuilder(buffer, { name: 'spotify.png' });

        const mainRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Spotifyda Ac').setEmoji('↗️').setStyle(ButtonStyle.Link).setURL(trackUrl),
            new ButtonBuilder().setLabel('Sarki Sozleri').setStyle(ButtonStyle.Link).setURL(lyricsSearch(song, artist)),
        );

        const suggestionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel(`1. ${song}`.slice(0, 80)).setEmoji('↗️').setStyle(ButtonStyle.Link).setURL(spotifySearch(`${song} ${artist}`)),
            new ButtonBuilder().setLabel(`2. ${artist}`.slice(0, 80)).setEmoji('↗️').setStyle(ButtonStyle.Link).setURL(spotifySearch(artist)),
            new ButtonBuilder().setLabel(`3. ${album}`.slice(0, 80)).setEmoji('↗️').setStyle(ButtonStyle.Link).setURL(spotifySearch(`${album} ${artist}`)),
        );

        return message.reply({
            files: [file],
            components: [mainRow, suggestionRow],
            allowedMentions: { parse: [], users: [], roles: [] },
        });
    },
};
