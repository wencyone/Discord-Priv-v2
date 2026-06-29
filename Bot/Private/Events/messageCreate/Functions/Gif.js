const Settings = require('../../../../Schema/Settings');

module.exports = async function Gif(client, message) {
    if (!message.guild) return false;
    if (message.channel?.name?.toLowerCase() !== 'chat') return false;

    const document = await Settings.findOne({ id: message.guild.id });
    if (!document) return false;

    if (document.gifGuard === false) return false;

    const isOwner = global.system?.ownerID?.includes(message.author.id) === true;
    const hasGifPermission = document.gifAuthRole && message.member?.roles.cache.has(document.gifAuthRole);
    if (isOwner || hasGifPermission) return false;

    const isGifUrl = (value) => {
        const text = String(value || '').toLowerCase();
        return (
            text.includes('tenor.com/') ||
            text.includes('giphy.com/') ||
            /\.gif(?:\?|$)/i.test(text)
        );
    };

    const hasGif = () => {
        // Check attachments for GIF
        if (message.attachments.size > 0 && message.attachments.some(att => 
            att.contentType?.startsWith('image/gif') || 
            att.name?.toLowerCase().endsWith('.gif') ||
            isGifUrl(att.url) ||
            isGifUrl(att.proxyURL)
        )) {
            return true;
        }

        // Check animated custom emojis from guilds
        if (/<a:[a-zA-Z0-9_]+:\d+>/.test(message.content || '')) {
            return true;
        }

        // Check animated/GIF stickers
        if (message.stickers?.size > 0 && message.stickers.some(sticker => {
            const format = String(sticker.format ?? sticker.formatType ?? '').toLowerCase();
            return format === '4' || format === 'gif' || sticker.url?.toLowerCase().includes('.gif');
        })) {
            return true;
        }

        // Check Discord GIF picker embeds/favorites
        if (message.embeds?.length > 0 && message.embeds.some(embed => {
            const provider = embed.provider?.name?.toLowerCase();
            const type = String(embed.type || '').toLowerCase();
            const urls = [
                embed.url,
                embed.thumbnail?.url,
                embed.image?.url,
                embed.video?.url,
                embed.data?.url,
                embed.data?.thumbnail?.url,
                embed.data?.image?.url,
                embed.data?.video?.url,
            ];

            return (
                type === 'gifv' ||
                provider === 'tenor' ||
                provider === 'giphy' ||
                urls.some(isGifUrl)
            );
        })) {
            return true;
        }

        // Check content for tenor or giphy links
        if (isGifUrl(message.content)) {
            return true;
        }

        return false;
    };

    if (hasGif()) {
        await message.delete().catch(() => {});
        const warnMessage = await message.channel.send(`${message.author}, bu sunucuda chat kanalında GIF göndermek yasaktır!`).catch(() => null);
        if (warnMessage) {
            setTimeout(() => {
                warnMessage.delete().catch(() => {});
            }, 5000);
        }
        return true;
    }

    return false;
};
