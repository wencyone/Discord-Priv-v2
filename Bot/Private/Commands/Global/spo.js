const { AttachmentBuilder, PermissionsBitField } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

const WIDTH = 1000;
const HEIGHT = 360;

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
    text = String(text || '');
    if (ctx.measureText(text).width <= maxWidth) return text;

    while (ctx.measureText(text + '...').width > maxWidth && text.length > 0) {
        text = text.slice(0, -1);
    }

    return text + '...';
}

function formatTime(ms) {
    const sec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

async function createSpotifyCard(member, spotify) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    const song = spotify.details || 'Bilinmeyen Şarkı';
    const artist = spotify.state || 'Bilinmeyen Sanatçı';
    const album = spotify.assets?.largeText || spotify.album || 'Bilinmeyen Albüm';

    const start = spotify.timestamps?.start || Date.now();
    const end = spotify.timestamps?.end || Date.now() + 1;
    const current = Math.min(Date.now() - start, end - start);
    const total = end - start;
    const progress = Math.max(0, Math.min(current / total, 1));

    let cover = null;

    try {
        const url = spotify.assets?.largeImageURL?.();
        if (url) cover = await loadImage(url);
    } catch {}

    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, '#050505');
    bg.addColorStop(0.45, '#09130d');
    bg.addColorStop(1, '#020403');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (cover) {
        ctx.save();
        ctx.globalAlpha = 0.23;
        ctx.filter = 'blur(24px)';
        ctx.drawImage(cover, -70, -120, 520, 520);
        ctx.drawImage(cover, 650, -120, 520, 520);
        ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#1DB954';
    ctx.beginPath();
    ctx.arc(835, 75, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(160, 300, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    roundRect(ctx, 35, 35, 930, 290, 34);
    ctx.fillStyle = 'rgba(10, 14, 12, 0.78)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(29, 185, 84, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (cover) {
        ctx.save();
        roundRect(ctx, 75, 75, 210, 210, 26);
        ctx.clip();
        ctx.drawImage(cover, 75, 75, 210, 210);
        ctx.restore();

        ctx.strokeStyle = 'rgba(29, 185, 84, 0.65)';
        ctx.lineWidth = 3;
        roundRect(ctx, 75, 75, 210, 210, 26);
        ctx.stroke();
    }

    ctx.fillStyle = '#1DB954';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Spotify’da Dinliyor', 330, 95);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.fillText(fitText(ctx, song, 530), 330, 160);

    ctx.fillStyle = '#d1d5db';
    ctx.font = '32px Arial';
    ctx.fillText(fitText(ctx, artist, 530), 330, 205);

    ctx.fillStyle = '#8f9b94';
    ctx.font = '24px Arial';
    ctx.fillText(fitText(ctx, album, 530), 330, 242);

    const barX = 330;
    const barY = 270;
    const barW = 540;
    const barH = 12;

    roundRect(ctx, barX, barY, barW, barH, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();

    roundRect(ctx, barX, barY, barW * progress, barH, 8);
    ctx.fillStyle = '#1DB954';
    ctx.fill();

    ctx.fillStyle = '#e5e7eb';
    ctx.font = '18px Arial';
    ctx.fillText(formatTime(current), barX, 305);
    ctx.fillText(formatTime(total), barX + barW - 45, 305);

    return canvas.toBuffer('image/png');
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
            return message.reply({
                content: `Bu komut sadece ${channel} kanalında kullanılabilir.`,
            });
        }

        const member =
            message.mentions.members.first() ||
            message.guild.members.cache.get(args[0]) ||
            message.member;

        const spotify = member.presence?.activities?.find(
            (activity) => activity.name === 'Spotify'
        );

        if (!spotify) {
            return message.reply({
                content: `${member} şu anda Spotify’da bir şarkı dinlemiyor.`,
            });
        }

        try {
            const buffer = await createSpotifyCard(member, spotify);

            return message.reply({
                files: [
                    new AttachmentBuilder(buffer, {
                        name: 'spotify-card.png',
                    }),
                ],
            });
        } catch (err) {
            console.error(err);

            return message.reply({
                content: 'Spotify kartı oluşturulurken bir hata oluştu.',
            });
        }
    },
};