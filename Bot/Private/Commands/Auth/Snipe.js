const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    name: 'snipe',
    aliases: [],
    category: 'Auth',

    execute: async (client, message, args, wency) => {
        const snipe = wency.snipeData || [];
        if (snipe.length === 0) return message.reply({ content: 'Hiç mesaj silinmemiş.' });

        const embed = new EmbedBuilder({
            author: { name: message.member.displayName, icon_url: message.author.displayAvatarURL() },
            footer: { text: 'Created By Wency' },
            description: [
                `Yazan Kişi: <@${snipe[0].author}>`,
                `Silinme Tarihi: ${new Date(snipe[0].deleted).toLocaleString()}`,
                `Mesaj İçeriği: **${snipe[0].content ? (snipe[0].content.length > 200 ? snipe[0].content.slice(0, 200) + '...' : snipe[0].content) : 'Resim bulunuyor.'}**`,
            ].join('\n'),
        });

        await message.channel.send({ embeds: [embed] });

        const attachments = Array.from(snipe[0].attachments?.values() || []);
        for (let index = 0; index < attachments.length; index++) {
            await sendSnipeMedia(message.channel, attachments[index], index).catch((error) => {
                console.error(`[SNIPE MEDIA] ${snipe[0].id}/${index + 1}: ${error.message}`);
            });
        }
    }
};

async function sendSnipeMedia(channel, storedMedia, index) {
    const media = typeof storedMedia === 'string' ? { url: storedMedia } : storedMedia;
    const downloaded = await downloadMedia(media);

    if (downloaded) {
        const fileName = buildFileName(media, index, downloaded.contentType, downloaded.kind);
        await channel.send({
            files: [new AttachmentBuilder(downloaded.buffer, { name: fileName })],
        });
        return;
    }

    const fallbackURL = media.proxyURL || media.url;
    if (!fallbackURL) return;
    await channel.send({ content: fallbackURL });
}

async function downloadMedia(media) {
    const sources = [...new Set([media.url, media.proxyURL].filter(Boolean))];
    for (const source of sources) {
        try {
            const response = await axios.get(source, {
                responseType: 'arraybuffer',
                timeout: 20000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: { 'User-Agent': 'Mozilla/5.0 DiscordBot' },
            });
            const contentType = String(response.headers['content-type'] || media.contentType || '').split(';')[0];
            const kind = getMediaKind(source, media.name, contentType) || getMediaKind(media.url, media.name, media.contentType);
            if (!kind) continue;
            return { buffer: Buffer.from(response.data), contentType, kind };
        } catch (_) { }
    }
    return null;
}

function getMediaKind(url, name, contentType) {
    const normalizedType = String(contentType || '').toLowerCase();
    if (normalizedType === 'image' || normalizedType.startsWith('image/')) return 'image';
    if (normalizedType === 'video' || normalizedType.startsWith('video/')) return 'video';

    const pathname = getPathname(url);
    const extensionSource = `${pathname} ${String(name || '').toLowerCase()}`;
    if (/\.(png|jpe?g|gif|webp|avif|bmp|apng)(?:\s|$)/i.test(extensionSource)) return 'image';
    if (/\.(mp4|webm|mov|m4v|mkv|avi|mpeg|mpg|3gp)(?:\s|$)/i.test(extensionSource)) return 'video';
    return null;
}

function buildFileName(media, index, contentType, kind) {
    const originalName = String(media.name || '').replace(/[^a-zA-Z0-9._-]/g, '_');
    if (originalName && /\.[a-zA-Z0-9]{2,5}$/.test(originalName)) return `${index + 1}-${originalName}`;
    const extensions = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
    };
    return `snipe-${kind === 'video' ? 'video' : 'gorsel'}-${index + 1}.${extensions[contentType] || (kind === 'video' ? 'mp4' : 'png')}`;
}

function getPathname(url) {
    try {
        return new URL(url).pathname.toLowerCase();
    } catch (_) {
        return '';
    }
}
