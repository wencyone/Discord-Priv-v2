const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const UserModel = require('../Schema/User');

const INTERVALS = new Map();

const DEFAULT_BACKGROUND_URL = 'https://i.imgur.com/HJbjw2C.png';

function sumDays(days = {}) {
    return Object.values(days).reduce((total, day) => total + Number(day?.total || 0), 0);
}

function formatDuration(ms = 0) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) return `${hours}s ${minutes}dk`;
    return `${minutes}dk`;
}

function fitText(ctx, text, maxWidth) {
    text = String(text || '');
    if (ctx.measureText(text).width <= maxWidth) return text;

    while (text.length > 0 && ctx.measureText(text + '...').width > maxWidth) {
        text = text.slice(0, -1);
    }

    return text + '...';
}

function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.closePath();
}

async function getTopData(guild, field) {
    const members = guild.members.cache;
    const docs = await UserModel.find({}).lean();

    return docs
        .map((doc) => ({
            id: doc.id,
            total: sumDays(doc[field]),
        }))
        .filter((row) => row.total > 0 && members.has(row.id))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((row, index) => {
            const member = members.get(row.id);

            return {
                index: index + 1,
                id: row.id,
                name: member?.displayName || member?.user?.username || row.id,
                tag: member?.user?.tag || member?.user?.username || row.id,
                avatar: member?.user?.displayAvatarURL({ extension: 'png', size: 128 }),
                total: row.total,
            };
        });
}

async function drawBackground(ctx, width, height) {
    try {
        const bg = await loadImage(DEFAULT_BACKGROUND_URL);
        const scale = Math.max(width / bg.width, height / bg.height);
        const bgW = bg.width * scale;
        const bgH = bg.height * scale;

        ctx.drawImage(bg, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);
    } catch {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#050816');
        gradient.addColorStop(0.5, '#0f1028');
        gradient.addColorStop(1, '#2e1065');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, width, height);
}

async function drawAvatar(ctx, url, x, y, size) {
    try {
        const avatar = await loadImage(url);

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, x, y, size, size);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.stroke();
    } catch {}
}

async function drawColumn(ctx, x, y, w, h, icon, title, data, type) {
    drawRoundRect(ctx, x, y, w, h, 22);
    ctx.fillStyle = 'rgba(8, 14, 35, 0.78)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(124, 58, 237, 0.85)';
    ctx.beginPath();
    ctx.arc(x + 68, y + 66, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Sans';
    ctx.textAlign = 'center';
    ctx.fillText(icon, x + 68, y + 77);

    ctx.textAlign = 'left';
    ctx.font = 'bold 28px Sans';
    ctx.fillText(title, x + 118, y + 74);

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 118);
    ctx.lineTo(x + w - 28, y + 118);
    ctx.stroke();

    if (!data.length) {
        ctx.fillStyle = '#c4b5fd';
        ctx.font = '20px Sans';
        ctx.fillText('Veri bulunamadı.', x + 35, y + 178);
        return;
    }

    for (const [i, item] of data.entries()) {
        const rowY = y + 165 + i * 84;

        const colors = ['#facc15', '#d1d5db', '#fb923c', '#7c3aed', '#7c3aed'];
        const border = colors[i] || '#7c3aed';

        drawRoundRect(ctx, x + 28, rowY - 30, 48, 48, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.strokeStyle = border;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Sans';
        ctx.textAlign = 'center';
        ctx.fillText(String(item.index), x + 52, rowY + 3);

        await drawAvatar(ctx, item.avatar, x + 98, rowY - 34, 60);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 23px Sans';
        ctx.fillText(fitText(ctx, item.name, 155), x + 174, rowY - 5);

        ctx.fillStyle = '#a78bfa';
        ctx.font = '18px Sans';
        ctx.fillText(fitText(ctx, item.tag, 155), x + 174, rowY + 25);

        const value = type === 'messages'
            ? `${item.total}\nmesaj`
            : formatDuration(item.total);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 23px Sans';

        if (type === 'messages') {
            ctx.fillText(String(item.total), x + w - 28, rowY - 4);
            ctx.fillStyle = '#d8b4fe';
            ctx.font = '18px Sans';
            ctx.fillText('mesaj', x + w - 28, rowY + 24);
        } else {
            ctx.fillText(value, x + w - 28, rowY + 8);
        }
    }
}

async function createLeaderboardImage(guild) {
    await guild.members.fetch().catch(() => null);

    const messages = await getTopData(guild, 'messages');
    const voices = await getTopData(guild, 'voices');
    const streams = await getTopData(guild, 'streams');
    const cameras = await getTopData(guild, 'cameras');

    const width = 2048;
    const height = 768;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    await drawBackground(ctx, width, height);

    const cardY = 36;
    const cardW = 478;
    const cardH = 662;
    const gap = 26;
    const startX = 31;

    await drawColumn(ctx, startX, cardY, cardW, cardH, '💬', 'MESAJ SIRALAMASI', messages, 'messages');
    await drawColumn(ctx, startX + (cardW + gap), cardY, cardW, cardH, '🎙️', 'SES SIRALAMASI', voices, 'voice');
    await drawColumn(ctx, startX + (cardW + gap) * 2, cardY, cardW, cardH, '🖥️', 'YAYIN SIRALAMASI', streams, 'stream');
    await drawColumn(ctx, startX + (cardW + gap) * 3, cardY, cardW, cardH, '📹', 'KAMERA SIRALAMASI', cameras, 'camera');

    return canvas.toBuffer('image/png');
}

async function buildLeaderboardPayload(client, guild) {
    const buffer = await createLeaderboardImage(guild);

    const attachment = new AttachmentBuilder(buffer, {
        name: 'leaderboard.png',
    });

    return {
        content: null,
        embeds: [],
        files: [attachment],
    };
}

async function updateLeaderboard(client, guildId, panel) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild || !panel?.channelId || !panel?.messageId) return false;

    const channel = guild.channels.cache.get(panel.channelId);
    if (!channel?.isTextBased()) return false;

    const msg = await channel.messages.fetch(panel.messageId).catch(() => null);
    if (!msg) return false;

    const payload = await buildLeaderboardPayload(client, guild);

    await msg.edit(payload).catch(() => null);
    return true;
}

function startLeaderboardInterval(client, guildId, panel) {
    if (!panel?.interval || !panel?.messageId) return;

    client.leaderboardIntervals ||= new Map();

    const key = `${guildId}:${panel.messageId}`;

    const old = client.leaderboardIntervals.get(key) || INTERVALS.get(key);
    if (old) clearInterval(old);

    updateLeaderboard(client, guildId, panel).catch(() => {});

    const interval = setInterval(() => {
        updateLeaderboard(client, guildId, panel).catch(() => {});
    }, Number(panel.interval));

    client.leaderboardIntervals.set(key, interval);
    INTERVALS.set(key, interval);
}

module.exports = {
    buildLeaderboardPayload,
    startLeaderboardInterval,
    updateLeaderboard,
};
