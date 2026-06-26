const { Events, codeBlock, EmbedBuilder } = require('discord.js');

client.on(Events.MessageReactionRemoveAll, async (message, reactions) => {
    try {
        if (message.partial) message = await message.fetch().catch(() => null);
        if (!message || !message.guild || !message.channel) return;
        if (message.author?.bot) return;

        const channel = message.guild.channels.cache.find((c) => c.name === 'emoji-log');
        if (!channel || !channel.isTextBased()) return;

        const removedReactions = reactions
            .map((reaction) => {
                const emoji = reaction.emoji.id ? `${reaction.emoji} (${reaction.emoji.name}:${reaction.emoji.id})` : reaction.emoji.name;
                return `→ ${emoji}: ${reaction.count || 0}`;
            })
            .join('\n') || 'Bulunamadı';

        const embed = new EmbedBuilder({
            author: message.author ? {
                name: message.author.username,
                icon_url: message.author.displayAvatarURL({ extension: 'png', size: 4096 })
            } : undefined,
            title: 'Mesaj Tepkileri Temizlendi',
            description: [
                codeBlock('yaml', [
                    '# Silinen Emojiler',
                    removedReactions,
                    '',
                    '# Bilgilendirme',
                    `→ Kanal: ${message.channel.name}`,
                    `→ Mesaj ID: ${message.id}`,
                    `→ Mesaj Sahibi: ${message.author ? `${message.author.username} (${message.author.id})` : 'Bulunamadı'}`,
                    `→ Mesaj Linki: ${message.url}`,
                    `→ Gönderilme Tarihi: ${date(message.createdTimestamp)}`,
                    `→ Temizlenme Tarihi: ${date(Date.now())}`,
                    '→ Emojileri Temizleyen: Discord bu bilgiyi event/audit log ile vermiyor.',
                ].join('\n')),
            ].join('\n'),
        });

        await channel.send({ embeds: [embed] }).catch(() => null);
    } catch (error) {
        console.error('[MESSAGE_REACTION_REMOVE_ALL]', error);
    }
});

function date(date) {
    return new Date(date).toLocaleString('tr-TR', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
    });
}
