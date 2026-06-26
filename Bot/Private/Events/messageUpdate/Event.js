const { Events, codeBlock, EmbedBuilder } = require('discord.js');

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    try {
        if (oldMessage.partial) oldMessage = await oldMessage.fetch().catch(() => null);
        if (newMessage.partial) newMessage = await newMessage.fetch().catch(() => null);
        if (!oldMessage || !newMessage) return;
        if (!newMessage.guild || !newMessage.author || newMessage.author.bot) return;
        if (oldMessage.content === newMessage.content) return;

        const channel = newMessage.guild.channels.cache.find((c) => c.name === 'mesaj-log');
        if (!channel) return;

        const oldContent = trimContent(oldMessage.cleanContent || oldMessage.content || 'İçerik bulunamadı.');
        const newContent = trimContent(newMessage.cleanContent || newMessage.content || 'İçerik bulunamadı.');

        const embed = new EmbedBuilder({
            author: {
                name: newMessage.author.username,
                icon_url: newMessage.author.displayAvatarURL({ extension: 'png', size: 4096 })
            },
            title: 'Mesaj Güncellendi',
            description: [
                codeBlock('fix', `Eski Mesaj:\n${oldContent}`),
                codeBlock('fix', `Yeni Mesaj:\n${newContent}`),
                codeBlock('yaml', [
                    '# Bilgilendirme',
                    `→ Kanal: ${newMessage.channel.name}`,
                    `→ Mesaj ID: ${newMessage.id}`,
                    `→ Gönderen: ${newMessage.author.username} (${newMessage.author.id})`,
                    `→ Gönderilme Tarihi: ${date(newMessage.createdTimestamp)}`,
                    `→ Güncellenme Tarihi: ${date(Date.now())}`,
                ].join('\n')),
            ].join('\n'),
        });

        await channel.send({ embeds: [embed] }).catch(() => null);
    } catch (error) {
        console.error('[MESSAGE_UPDATE]', error);
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

function trimContent(content) {
    return content.length > 900 ? `${content.slice(0, 900)}...` : content;
}
