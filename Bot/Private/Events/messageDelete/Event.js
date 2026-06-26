const { Events, codeBlock, EmbedBuilder, AuditLogEvent, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const Settings = require('../../../Schema/Settings');

client.on(Events.MessageDelete, async (message) => {
    try {
        if (!message.guild || !message.author || message.author.bot) return;

        const mediaFiles = collectMessageMedia(message);
        await Settings.updateOne({ id: message.guild.id }, {
            $set: {
                snipeData: {
                    id: message.id,
                    author: message.author,
                    content: message.cleanContent || message.content || '',
                    attachments: mediaFiles.map((media) => media.url),
                    created: message.createdTimestamp,
                    deleted: Date.now(),
                }
            },
        }, { upsert: true });

        const channel = message.guild.channels.cache.find((target) => target.name === 'mesaj-log' && target.isTextBased());
        if (!channel) return;

        const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MessageDelete }).catch(() => null);
        const entry = fetchedLogs?.entries.first();
        const deletedBy = entry?.targetId === message.author.id
            && Date.now() - entry.createdTimestamp < 5000
            ? entry.executor
            : null;

        const content = message.cleanContent || message.content || '';
        const embed = new EmbedBuilder({
            author: {
                name: message.author.username,
                icon_url: message.author.displayAvatarURL({ extension: 'png', size: 4096 })
            },
            description: [
                content.length ? codeBlock('fix', trimContent(content)) : undefined,
                codeBlock('yaml', [
                    '# Bilgilendirme',
                    `→ Kanal: ${message.channel.name}`,
                    `→ Mesaj ID: ${message.id}`,
                    `→ Gönderen: ${message.author.username} (${message.author.id})`,
                    `→ Yetkili: ${deletedBy?.username || 'Kendisi / Bulunamadı'}`,
                    `→ Gönderilme Tarihi: ${date(message.createdTimestamp)}`,
                ].join('\n')),
            ].filter(Boolean).join('\n'),
        });

        await channel.send({ embeds: [embed] });
        for (let index = 0; index < mediaFiles.length; index++) {
            await sendDeletedMedia(channel, message, mediaFiles[index], index).catch((error) => {
                console.error(`[MESSAGE_DELETE MEDIA] ${message.id}/${index + 1}: ${error.message}`);
            });
        }
    } catch (error) {
        console.error('[MESSAGE_DELETE]', error);
    }
});

async function sendDeletedMedia(channel, message, media, index) {
    const downloaded = await downloadMedia(media);
    const mediaKind = downloaded?.kind || getMediaKind(media.url, media.name, media.contentType);
    const mediaLabel = mediaKind === 'video' ? 'Videoyu' : 'Görseli';
    const mediaEmbed = new EmbedBuilder()
        .setAuthor({
            name: message.author.username,
            iconURL: message.author.displayAvatarURL({ extension: 'png', size: 4096 })
        })
        .setDescription(`**${mediaLabel} gönderen:** <@${message.author.id}>\n**Silindiği kanal:** <#${message.channel.id}>`)
        .setFooter({
            text: `Kullanıcı: ${message.author.id} | Mesaj ID: ${message.id} • ${date(Date.now())}`
        });

    if (downloaded) {
        const fileName = buildFileName(media, index, downloaded.contentType, downloaded.kind);
        if (downloaded.kind === 'image') mediaEmbed.setImage(`attachment://${fileName}`);

        try {
            await channel.send({
                embeds: [mediaEmbed],
                files: [new AttachmentBuilder(downloaded.buffer, { name: fileName })]
            });
            return;
        } catch (error) {
            console.error(`[MESSAGE_DELETE MEDIA UPLOAD] ${message.id}/${index + 1}: ${error.message}`);
        }
    }

    // Dosya indirilemez veya Discord yuklemeyi boyut nedeniyle reddederse
    // CDN adresini kullan. Bir medya hatasi digerlerini durdurmaz.
    const fallbackURL = media.proxyURL || media.url;
    if (mediaKind === 'image') mediaEmbed.setImage(fallbackURL);
    await channel.send({ content: fallbackURL, embeds: [mediaEmbed] });
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
                headers: { 'User-Agent': 'Mozilla/5.0 DiscordBot' }
            });
            const contentType = String(response.headers['content-type'] || media.contentType || '').split(';')[0];
            const kind = getMediaKind(source, media.name, contentType)
                || getMediaKind(media.url, media.name, media.contentType);
            if (!kind) continue;
            return { buffer: Buffer.from(response.data), contentType, kind };
        } catch (_) {
            // Bir sonraki CDN/proxy adresini dene.
        }
    }
    return null;
}

function collectMessageMedia(message) {
    const mediaFiles = [];
    const add = (url, proxyURL, name, contentType) => {
        const cleanURL = cleanMediaURL(url);
        const cleanProxyURL = cleanMediaURL(proxyURL);
        if (!cleanURL || !getMediaKind(cleanURL, name, contentType)) return;
        if (mediaFiles.some((media) => media.url === cleanURL || (cleanProxyURL && media.proxyURL === cleanProxyURL))) return;
        mediaFiles.push({ url: cleanURL, proxyURL: cleanProxyURL, name, contentType });
    };

    for (const attachment of message.attachments.values()) {
        add(attachment.url, attachment.proxyURL, attachment.name, attachment.contentType);
    }

    for (const sourceEmbed of message.embeds || []) {
        add(sourceEmbed.image?.url, sourceEmbed.image?.proxyURL, null, 'image');
        add(sourceEmbed.thumbnail?.url, sourceEmbed.thumbnail?.proxyURL, null, 'image');
        add(sourceEmbed.video?.url, sourceEmbed.video?.proxyURL, null, 'video');
    }

    for (const sticker of message.stickers?.values?.() || []) {
        add(sticker.url, sticker.url, sticker.name || 'sticker', 'image');
    }

    const urls = String(message.content || '').match(/https?:\/\/[^\s<>]+/gi) || [];
    for (const url of urls) add(url, null, null, null);

    return mediaFiles;
}

function getMediaKind(url, name, contentType) {
    const normalizedType = String(contentType || '').toLowerCase();
    if (normalizedType === 'image' || normalizedType.startsWith('image/')) return 'image';
    if (normalizedType === 'video' || normalizedType.startsWith('video/')) return 'video';

    const extensionSource = `${getPathname(url)} ${String(name || '').toLowerCase()}`;
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
        'image/avif': 'avif',
        'image/bmp': 'bmp',
        'image/apng': 'apng',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'video/x-m4v': 'm4v',
        'video/x-matroska': 'mkv',
        'video/x-msvideo': 'avi',
        'video/mpeg': 'mpeg',
        'video/3gpp': '3gp'
    };
    return `silinen-${kind === 'video' ? 'video' : 'gorsel'}-${index + 1}.${extensions[contentType] || (kind === 'video' ? 'mp4' : 'png')}`;
}

function cleanMediaURL(url) {
    if (!url) return null;
    return String(url).replace(/[),.;!?]+$/g, '');
}

function getPathname(url) {
    try {
        return new URL(url).pathname.toLowerCase();
    } catch (_) {
        return '';
    }
}

function trimContent(content) {
    return content.length > 900 ? `${content.slice(0, 900)}...` : content;
}

function date(value) {
    return new Date(value).toLocaleString('tr-TR', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    });
}
